import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ComplianceServiceAppModule } from './compliance-service.module';
import { DataSource } from 'typeorm';
import { GlobalExceptionFilter } from '../shared/filters/global-exception.filter';
import { docsAuthMiddleware } from '../common/middleware/docs-auth.middleware';
import { BlankStringToNullPipe } from '../common/pipes/blank-string-to-null.pipe';
import { getAppVersion } from '../common/app-version';
import { completeOpenApiDocument } from '../common/swagger/complete-openapi';

async function bootstrap() {
  const app = await NestFactory.create(ComplianceServiceAppModule);
  const configService = app.get(ConfigService);
  const serviceVersion = getAppVersion();

  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, hsts: false }));
  app.enableCors({
    origin: (configService.get<string>('CORS_ORIGIN') || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    credentials: true,
  });
  app.use(
    '/api',
    rateLimit({
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 1 * 60 * 1000),
      max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 4000),
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.useGlobalPipes(
    new BlankStringToNullPipe(),
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.setGlobalPrefix('api');
  const http = app.getHttpAdapter().getInstance();
  const port = Number(process.env.COMPLIANCE_SERVICE_PORT || 4103);
  http.get('/api/health', (_req: any, res: any) =>
    res.json({ status: 'ok', service: 'compliance', version: serviceVersion }),
  );
  http.get('/api/health/live', (_req: any, res: any) =>
    res.json({ status: 'ok', service: 'compliance', version: serviceVersion }),
  );
  http.get('/api/health/ready', async (_req: any, res: any) => {
    const checks: Record<string, boolean> = {};
    let dbOk = false;

    try {
      const ds = app.get(DataSource);
      await ds.query('SELECT 1');
      dbOk = true;
      checks.db = true;

      // Check cross-DB views (users, role_definitions)
      const viewChecks = ['users', 'role_definitions'];
      for (const view of viewChecks) {
        try {
          await ds.query(`SELECT 1 FROM \`${view}\` LIMIT 1`);
          checks[`view_${view}`] = true;
        } catch {
          checks[`view_${view}`] = false;
        }
      }
    } catch (err: any) {
      return res.status(503).json({
        status: 'error',
        service: 'compliance',
        reason: 'db_unreachable',
      });
    }

    // Check Redis connectivity (required for Bull document processing queue)
    try {
      const redisHost = configService.get<string>('REDIS_HOST') || 'localhost';
      const redisPort = Number(configService.get('REDIS_PORT') || 6379);
      const net = await import('net');
      await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection(redisPort, redisHost);
        socket.setTimeout(1000);
        socket.on('connect', () => {
          socket.destroy();
          resolve();
        });
        socket.on('error', reject);
        socket.on('timeout', () => {
          socket.destroy();
          reject(new Error('timeout'));
        });
      });
      checks.redis = true;
    } catch {
      checks.redis = false;
    }

    const allOk = Object.values(checks).every(Boolean);
    res.status(allOk ? 200 : 207).json({
      status: allOk ? 'ok' : 'degraded',
      service: 'compliance',
      version: serviceVersion,
      checks: { ready: allOk },
    });
  });

  // Ensure cross-DB VIEWs so the compliance service can access user/role data from compliance_hub_users
  if (String(process.env.DB_BOOTSTRAP ?? 'false').toLowerCase() === 'true') {
    try {
      const dataSource = app.get(DataSource);
      const usersDb = process.env.USERS_DB_DATABASE || '02_db_compliance_hub_users_prod';
      const conn = dataSource.createQueryRunner();
      await conn.connect();
      try {
        await conn
          .query(`CREATE OR REPLACE VIEW users AS SELECT * FROM \`${usersDb}\`.users`)
          .catch(() => undefined);
        await conn
          .query(
            `CREATE OR REPLACE VIEW role_definitions AS SELECT * FROM \`${usersDb}\`.role_definitions`,
          )
          .catch(() => undefined);
      } finally {
        await conn.release();
      }
    } catch (_e) {
      /* non-fatal: service starts regardless of VIEW creation status */
    }
  }

  // OpenAPI/Swagger — accessible at /api/docs (not proxied through gateway)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Compliance Hub — Compliance Service')
    .setDescription(
      'Document management, issuances, KPI tracking, MOV, metrics, cybersecurity, and incident reporting',
    )
    .setVersion(serviceVersion)
    .addBearerAuth()
    .addSecurityRequirements('bearer')
    .addTag('documents', 'Document upload, review, and assignment')
    .addTag('document-types', 'Document type definitions')
    .addTag('issuances', 'ICT issuance reference management')
    .addTag('kpi', 'Key performance indicator tracking')
    .addTag('reports', 'Consolidated compliance reporting')
    .addTag('mov', 'Means of verification records')
    .addTag('metrics', 'Compliance metrics and reporting')
    .addTag('incidents', 'IT incident management')
    .addTag('cybersecurity', 'Cybersecurity compliance records')
    .addTag('reviews', 'Document reviews and comparisons')
    .build();
  const swaggerDoc = completeOpenApiDocument(SwaggerModule.createDocument(app, swaggerConfig));
  app.use('/api/docs', docsAuthMiddleware);
  app.use('/api/openapi.json', docsAuthMiddleware);
  SwaggerModule.setup('api/docs', app, swaggerDoc, {
    jsonDocumentUrl: 'api/openapi.json',
  });

  await app.listen(port, '0.0.0.0');
  console.log(`Compliance service running on http://localhost:${port}/api`);
  console.log(`Compliance service OpenAPI docs: http://localhost:${port}/api/docs`);
}

bootstrap();
