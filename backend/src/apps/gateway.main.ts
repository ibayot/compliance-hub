import { NestFactory } from '@nestjs/core';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { Request, Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { GatewayAppModule } from './gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(GatewayAppModule);

  const usersServiceUrl = process.env.USERS_SERVICE_URL || 'http://localhost:4101';
  const ticketingServiceUrl = process.env.TICKETING_SERVICE_URL || 'http://localhost:4102';
  const complianceServiceUrl = process.env.COMPLIANCE_SERVICE_URL || 'http://localhost:4103';
  const strictMode = (process.env.MICROSERVICES_STRICT || 'true').toLowerCase() !== 'false';

  app.use(helmet());
  app.enableCors({
    origin: (process.env.CORS_ORIGIN || '')
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

  app.use('/api/auth', createProxyMiddleware({ target: `${usersServiceUrl}/api/auth`, changeOrigin: true }));
  app.use('/api/users', createProxyMiddleware({ target: `${usersServiceUrl}/api/users`, changeOrigin: true }));
  app.use('/api/units', createProxyMiddleware({ target: `${usersServiceUrl}/api/units`, changeOrigin: true }));

  app.use('/api/tickets', createProxyMiddleware({ target: `${ticketingServiceUrl}/api/tickets`, changeOrigin: true }));
  app.use('/api/attendance', createProxyMiddleware({ target: `${ticketingServiceUrl}/api/attendance`, changeOrigin: true }));
  app.use('/api/ticket-settings', createProxyMiddleware({ target: `${ticketingServiceUrl}/api/ticket-settings`, changeOrigin: true }));

  app.use('/api/documents', createProxyMiddleware({ target: `${complianceServiceUrl}/api/documents`, changeOrigin: true }));
  app.use('/api/document-types', createProxyMiddleware({ target: `${complianceServiceUrl}/api/document-types`, changeOrigin: true }));
  app.use('/api/comparisons', createProxyMiddleware({ target: `${complianceServiceUrl}/api/comparisons`, changeOrigin: true }));
  app.use('/api/issuances', createProxyMiddleware({ target: `${complianceServiceUrl}/api/issuances`, changeOrigin: true }));
  app.use('/api/metrics', createProxyMiddleware({ target: `${complianceServiceUrl}/api/metrics`, changeOrigin: true }));
  app.use('/api/incidents', createProxyMiddleware({ target: `${complianceServiceUrl}/api/incidents`, changeOrigin: true }));
  app.use('/api/cybersecurity', createProxyMiddleware({ target: `${complianceServiceUrl}/api/cybersecurity`, changeOrigin: true }));
  app.use('/api/kpi', createProxyMiddleware({ target: `${complianceServiceUrl}/api/kpi`, changeOrigin: true }));
  app.use('/api/mov', createProxyMiddleware({ target: `${complianceServiceUrl}/api/mov`, changeOrigin: true }));

  app.use('/api/health', (_req: Request, res: Response) => {
    res.json({
      service: 'api-gateway',
      status: 'ok',
      usersServiceUrl,
      ticketingServiceUrl,
      complianceServiceUrl,
      strictMode,
      version: process.env.npm_package_version || '0.0.0',
    });
  });

  if (strictMode) {
    app.use('/api', (req: Request, res: Response) => {
      res.status(503).json({
        message: 'Endpoint not available in microservices mode.',
        path: req.path,
        usersServiceUrl,
        ticketingServiceUrl,
        complianceServiceUrl,
      });
    });
  }

  await app.listen(Number(process.env.PORT || 4000));
  console.log(`API Gateway running on http://localhost:${process.env.PORT || 4000}/api`);
}

bootstrap();
