import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ComplianceServiceAppModule } from './compliance-service.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create(ComplianceServiceAppModule);
  const configService = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: (configService.get<string>('CORS_ORIGIN') || '').split(',').map((o) => o.trim()).filter(Boolean),
    credentials: true,
  });
  app.use(
    '/api',
    rateLimit({
      windowMs: Number(configService.get('RATE_LIMIT_WINDOW_MS') || 15 * 60 * 1000),
      max: Number(configService.get('RATE_LIMIT_MAX_REQUESTS') || 1000),
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.setGlobalPrefix('api');

  const port = Number(process.env.COMPLIANCE_SERVICE_PORT || 4103);
  app.use('/api/health', (_req: any, res: any) => res.json({ status: 'ok', service: 'compliance' }));
  app.use('/api/health/live', (_req: any, res: any) => res.json({ status: 'ok', service: 'compliance' }));
  app.use('/api/health/ready', async (_req: any, res: any) => {
    try {
      const ds = app.get(DataSource);
      await ds.query('SELECT 1');
      res.json({ status: 'ok', service: 'compliance' });
    } catch {
      res.status(503).json({ status: 'error', service: 'compliance', reason: 'db_unreachable' });
    }
  });
  // Ensure cross-DB VIEWs so the compliance service can access user/role data from compliance_hub_users
  try {
    const dataSource = app.get(DataSource);
    const usersDb = process.env.USERS_DB_DATABASE || 'compliance_hub_users';
    const conn = dataSource.createQueryRunner();
    await conn.connect();
    try {
      await conn.query(`CREATE OR REPLACE VIEW users AS SELECT * FROM \`${usersDb}\`.users`).catch(() => undefined);
      await conn.query(`CREATE OR REPLACE VIEW role_definitions AS SELECT * FROM \`${usersDb}\`.role_definitions`).catch(() => undefined);
    } finally {
      await conn.release();
    }
  } catch (_e) { /* non-fatal: service starts regardless of VIEW creation status */ }
  await app.listen(port);
  console.log(`Compliance service running on http://localhost:${port}/api`);
}

bootstrap();
