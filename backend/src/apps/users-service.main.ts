import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { DataSource } from 'typeorm';
import { UsersServiceAppModule } from './users-service.module';
import { GlobalExceptionFilter } from '../shared/filters/global-exception.filter';

async function bootstrap() {
  process.env.AUTH_ENABLE_TICKET_HOOKS = 'false';

  const app = await NestFactory.create(UsersServiceAppModule);
  const configService = app.get(ConfigService);
  const serviceVersion = process.env.npm_package_version || '0.0.0';

  app.use(helmet());
  app.enableCors({
    origin: (configService.get<string>('CORS_ORIGIN') || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.setGlobalPrefix('api');
  const http = app.getHttpAdapter().getInstance();
  const port = Number(process.env.USERS_SERVICE_PORT || 4101);
  http.get('/api/health', (_req: any, res: any) =>
    res.json({ status: 'ok', service: 'users', version: serviceVersion }),
  );
  http.get('/api/health/live', (_req: any, res: any) =>
    res.json({ status: 'ok', service: 'users', version: serviceVersion }),
  );
  http.get('/api/health/ready', async (_req: any, res: any) => {
    try {
      const ds = app.get(DataSource);
      await ds.query('SELECT 1');
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbName =
        process.env.USERS_DB_DATABASE || process.env.DB_DATABASE || 'compliance_hub_users';

      // Verify role_capabilities table/view has data (cache won't be populated if empty)
      const [roleCapsCheck] = await ds
        .query('SELECT COUNT(*) as cnt FROM role_capabilities')
        .catch(() => [{ cnt: 0 }]);
      const roleCapsCount = Number(roleCapsCheck?.cnt ?? 0);

      res.json({
        status: 'ok',
        service: 'users',
        version: serviceVersion,
        topology: {
          runtime: 'single-vm-multi-container',
          containerRole: 'users-service',
          dbServer: dbHost,
          dbName,
          sharedDbServer: true,
        },
        checks: { db: true, role_capabilities_rows: roleCapsCount },
      });
    } catch (err: any) {
      res.status(503).json({
        status: 'error',
        service: 'users',
        reason: 'db_unreachable',
        detail: err?.message,
      });
    }
  });

  // OpenAPI/Swagger — accessible at /api/docs (not proxied through gateway)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Compliance Hub — Users Service')
    .setDescription('User management, authentication, role definitions, and role capability matrix')
    .setVersion(serviceVersion)
    .addBearerAuth()
    .addSecurityRequirements('bearer')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User CRUD and profile management')
    .addTag('units', 'Organisational unit management')
    .addTag('role-capabilities', 'Role capability matrix administration')
    .addTag('audit-logs', 'System-wide audit logging and tracking')
    .addTag('_internal', 'Internal service-to-service communication')
    .build();
  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDoc, {
    jsonDocumentUrl: 'api/openapi.json',
  });

  await app.listen(port, '0.0.0.0');
  console.log(`Users service running on http://localhost:${port}/api`);
  console.log(`Users service OpenAPI docs: http://localhost:${port}/api/docs`);
}

bootstrap();
