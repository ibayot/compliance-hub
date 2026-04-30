import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { DataSource } from 'typeorm';
import { UsersServiceAppModule } from './users-service.module';

async function bootstrap() {
  process.env.AUTH_ENABLE_TICKET_HOOKS = 'false';

  const app = await NestFactory.create(UsersServiceAppModule);
  const configService = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: (configService.get<string>('CORS_ORIGIN') || '').split(',').map((o) => o.trim()).filter(Boolean),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.setGlobalPrefix('api');

  const port = Number(process.env.USERS_SERVICE_PORT || 4101);
  app.use('/api/health', (_req: any, res: any) => res.json({ status: 'ok', service: 'users' }));
  app.use('/api/health/live', (_req: any, res: any) => res.json({ status: 'ok', service: 'users' }));
  app.use('/api/health/ready', async (_req: any, res: any) => {
    try {
      const ds = app.get(DataSource);
      await ds.query('SELECT 1');
      res.json({ status: 'ok', service: 'users' });
    } catch {
      res.status(503).json({ status: 'error', service: 'users', reason: 'db_unreachable' });
    }
  });
  await app.listen(port);
  console.log(`Users service running on http://localhost:${port}/api`);
}

bootstrap();
