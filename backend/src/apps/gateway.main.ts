import { NestFactory } from '@nestjs/core';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { GatewayAppModule } from './gateway.module';

const SERVICE_UNAVAILABLE_MESSAGE = 'Service currently unavailable. Please start the service and try again.';

function createServiceProxy(target: string, service: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    proxyTimeout: 30_000,
    timeout: 31_000,
    on: {
      proxyReq: (proxyReq, req: Request) => {
        // Propagate correlation ID to downstream service
        const requestId =
          (req.headers['x-request-id'] as string | undefined) || randomUUID();
        proxyReq.setHeader('x-request-id', requestId);
      },
      error: (_err, req, res) => {
        const response = res as Response;
        response.status(503).json({
          message: SERVICE_UNAVAILABLE_MESSAGE,
          service,
          path: req.url,
        });
      },
    },
  });
}

async function checkServiceHealth(baseUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const response = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(GatewayAppModule);

  const usersServiceUrl = process.env.USERS_SERVICE_URL || 'http://localhost:4101';
  const ticketingServiceUrl = process.env.TICKETING_SERVICE_URL || 'http://localhost:4102';
  const complianceServiceUrl = process.env.COMPLIANCE_SERVICE_URL || 'http://localhost:4103';
  const strictMode = (process.env.MICROSERVICES_STRICT || 'true').toLowerCase() !== 'false';

  app.use(helmet());

  // Attach/preserve correlation ID on every request so all downstream services
  // can trace a single frontend interaction through the logs.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    const requestId =
      (_req.headers['x-request-id'] as string | undefined)?.trim() || randomUUID();
    _req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });

  app.enableCors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000')
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

  app.use('/api/auth', createServiceProxy(`${usersServiceUrl}/api/auth`, 'users'));
  app.use('/api/users', createServiceProxy(`${usersServiceUrl}/api/users`, 'users'));
  app.use('/api/units', createServiceProxy(`${usersServiceUrl}/api/units`, 'users'));

  app.use('/api/tickets', createServiceProxy(`${ticketingServiceUrl}/api/tickets`, 'ticketing'));
  app.use('/api/attendance', createServiceProxy(`${ticketingServiceUrl}/api/attendance`, 'ticketing'));
  app.use('/api/ticket-settings', createServiceProxy(`${ticketingServiceUrl}/api/ticket-settings`, 'ticketing'));

  app.use('/api/documents', createServiceProxy(`${complianceServiceUrl}/api/documents`, 'compliance'));
  app.use('/api/document-types', createServiceProxy(`${complianceServiceUrl}/api/document-types`, 'compliance'));
  app.use('/api/comparisons', createServiceProxy(`${complianceServiceUrl}/api/comparisons`, 'compliance'));
  app.use('/api/issuances', createServiceProxy(`${complianceServiceUrl}/api/issuances`, 'compliance'));
  app.use('/api/metrics', createServiceProxy(`${complianceServiceUrl}/api/metrics`, 'compliance'));
  app.use('/api/incidents', createServiceProxy(`${complianceServiceUrl}/api/incidents`, 'compliance'));
  app.use('/api/cybersecurity', createServiceProxy(`${complianceServiceUrl}/api/cybersecurity`, 'compliance'));
  app.use('/api/kpi', createServiceProxy(`${complianceServiceUrl}/api/kpi`, 'compliance'));
  app.use('/api/mov', createServiceProxy(`${complianceServiceUrl}/api/mov`, 'compliance'));
  // Role capabilities matrix is surfaced under compliance namespace for frontend capability management.
  app.use('/api/compliance/role-capabilities', createServiceProxy(`${usersServiceUrl}/api/users/role-capabilities`, 'users'));

  app.use('/api/health', async (_req: Request, res: Response) => {
    const [usersAvailable, ticketingAvailable, complianceAvailable] = await Promise.all([
      checkServiceHealth(usersServiceUrl),
      checkServiceHealth(ticketingServiceUrl),
      checkServiceHealth(complianceServiceUrl),
    ]);

    res.json({
      service: 'api-gateway',
      status: 'ok',
      usersServiceUrl,
      ticketingServiceUrl,
      complianceServiceUrl,
      services: {
        users: usersAvailable,
        ticketing: ticketingAvailable,
        compliance: complianceAvailable,
      },
      strictMode,
      version: process.env.npm_package_version || '0.0.0',
    });
  });

  if (strictMode) {
    app.use('/api', (req: Request, res: Response) => {
      res.status(503).json({
        message: 'Service currently unavailable for this endpoint in microservices mode.',
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
