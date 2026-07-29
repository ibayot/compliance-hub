import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { DataSource } from 'typeorm';
import { TicketingServiceAppModule } from './ticketing-service.module';
import { GlobalExceptionFilter } from '../shared/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(TicketingServiceAppModule);
  const configService = app.get(ConfigService);
  const serviceVersion = process.env.npm_package_version || '0.0.0';

  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
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
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.setGlobalPrefix('api');
  const http = app.getHttpAdapter().getInstance();
  const port = Number(process.env.TICKETING_SERVICE_PORT || 4102);
  http.get('/api/health', (_req: any, res: any) =>
    res.json({ status: 'ok', service: 'ticketing', version: serviceVersion }),
  );
  http.get('/api/health/live', (_req: any, res: any) =>
    res.json({ status: 'ok', service: 'ticketing', version: serviceVersion }),
  );
  http.get('/api/health/ready', async (_req: any, res: any) => {
    try {
      const ds = app.get(DataSource);
      await ds.query('SELECT 1');
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbName =
        process.env.TICKETING_DB_DATABASE || process.env.DB_DATABASE || 'compliance_hub_ticketing';

      // Check that cross-DB views are accessible (critical dependency for ticketing queries)
      const checks: Record<string, boolean> = { db: true };
      const viewChecks = ['users', 'units', 'role_definitions', 'role_capabilities'];
      for (const view of viewChecks) {
        try {
          await ds.query(`SELECT 1 FROM \`${view}\` LIMIT 1`);
          checks[`view_${view}`] = true;
        } catch {
          checks[`view_${view}`] = false;
        }
      }

      const allViewsOk = viewChecks.every((v) => checks[`view_${v}`]);
      const httpStatus = allViewsOk ? 200 : 207; // 207 Multi-Status: partial degradation
      res.status(httpStatus).json({
        status: allViewsOk ? 'ok' : 'degraded',
        service: 'ticketing',
        version: serviceVersion,
        topology: {
          runtime: 'single-vm-multi-container',
          containerRole: 'ticketing-service',
          dbServer: dbHost,
          dbName,
          sharedDbServer: true,
        },
        checks,
      });
    } catch (err: any) {
      res.status(503).json({
        status: 'error',
        service: 'ticketing',
        reason: 'db_unreachable',
        detail: err?.message,
      });
    }
  });

  // OpenAPI/Swagger — accessible at /api/docs (not proxied through gateway)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Compliance Hub — Ticketing Service')
    .setDescription('IT helpdesk ticket management, attendance tracking, and SLA monitoring')
    .setVersion(serviceVersion)
    .addBearerAuth()
    .addSecurityRequirements('bearer')
    .addTag('tickets', 'Ticket creation, updates, and resolution')
    .addTag('attendance', 'Staff attendance and ITO logs')
    .addTag('ticket-settings', 'Ticket routing rules and category management')
    .addTag('knowledge-base', 'Knowledge base and FAQs')
    .build();
  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDoc, {
    jsonDocumentUrl: 'api/openapi.json',
  });

  await app.listen(port, '0.0.0.0');
  console.log(`Ticketing service running on http://localhost:${port}/api`);
  console.log(`Ticketing service OpenAPI docs: http://localhost:${port}/api/docs`);
}

bootstrap();
