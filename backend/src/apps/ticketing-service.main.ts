import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { TicketingServiceAppModule } from './ticketing-service.module';

async function bootstrap() {
  const app = await NestFactory.create(TicketingServiceAppModule);
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

  const port = Number(process.env.TICKETING_SERVICE_PORT || 4102);
  app.use('/api/health', (_req: any, res: any) => res.json({ status: 'ok', service: 'ticketing' }));
  await app.listen(port);
  console.log(`Ticketing service running on http://localhost:${port}/api`);
}

bootstrap();
