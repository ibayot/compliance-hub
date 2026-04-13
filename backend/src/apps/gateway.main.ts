import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { Request, Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { GatewayAppModule } from './gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(GatewayAppModule);
  const configService = app.get(ConfigService, { strict: false });

  const usersServiceUrl = process.env.USERS_SERVICE_URL || 'http://localhost:4101';
  const ticketingServiceUrl = process.env.TICKETING_SERVICE_URL || 'http://localhost:4102';

  app.use(helmet());
  app.enableCors({
    origin: (configService?.get<string>('CORS_ORIGIN') || process.env.CORS_ORIGIN || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    credentials: true,
  });

  app.use(
    '/api',
    rateLimit({
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
      max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 1000),
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use('/api/auth', createProxyMiddleware({ target: usersServiceUrl, changeOrigin: true }));
  app.use('/api/users', createProxyMiddleware({ target: usersServiceUrl, changeOrigin: true }));
  app.use('/api/units', createProxyMiddleware({ target: usersServiceUrl, changeOrigin: true }));

  app.use('/api/tickets', createProxyMiddleware({ target: ticketingServiceUrl, changeOrigin: true }));
  app.use('/api/attendance', createProxyMiddleware({ target: ticketingServiceUrl, changeOrigin: true }));
  app.use('/api/ticket-settings', createProxyMiddleware({ target: ticketingServiceUrl, changeOrigin: true }));

  app.use('/api/health', (_req: Request, res: Response) => {
    res.json({
      service: 'api-gateway',
      status: 'ok',
      usersServiceUrl,
      ticketingServiceUrl,
      version: process.env.npm_package_version || '0.0.0',
    });
  });

  await app.listen(Number(process.env.PORT || 4000));
  console.log(`API Gateway running on http://localhost:${process.env.PORT || 4000}/api`);
}

bootstrap();
