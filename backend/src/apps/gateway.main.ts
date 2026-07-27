import { NestFactory } from '@nestjs/core';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { GatewayAppModule } from './gateway.module';

const SERVICE_DOMAINS: Record<string, string[]> = {
  users: ['/api/auth', '/api/users', '/api/units', '/api/audit-logs'],
  ticketing: ['/api/tickets', '/api/attendance', '/api/ticket-settings', '/api/knowledge-base'],
  compliance: [
    '/api/documents',
    '/api/document-types',
    '/api/comparisons',
    '/api/issuances',
    '/api/metrics',
    '/api/incidents',
    '/api/cybersecurity',
    '/api/kpi',
    '/api/mov',
  ],
};

function createServiceProxy(target: string, service: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    proxyTimeout: 30_000,
    timeout: 31_000,
    on: {
      proxyReq: (proxyReq, req: Request) => {
        // Propagate correlation ID to downstream service
        const requestId = (req.headers['x-request-id'] as string | undefined) || randomUUID();
        proxyReq.setHeader('x-request-id', requestId);
      },
      proxyRes: (proxyRes, _req, res: Response) => {
        // Propagate X-Service-Version from downstream to the client so callers
        // can detect version mismatches without inspecting the body.
        const svcVersion = proxyRes.headers['x-service-version'];
        if (svcVersion) {
          res.setHeader('x-service-version', svcVersion);
        }
        res.setHeader('x-served-by', service);
      },
      error: (_err, req, res) => {
        const response = res as Response;
        // Domain-aware error: tell the client which domain is unavailable
        // so the frontend can degrade gracefully (e.g., still show tickets if compliance is down)
        const path = req.url ?? '';
        const affectedDomain =
          Object.entries(SERVICE_DOMAINS).find(([, prefixes]) =>
            prefixes.some((p) => path.startsWith(p.replace('/api', ''))),
          )?.[0] ?? service;
        response.status(503).json({
          error: 'service_unavailable',
          service: affectedDomain,
          message: `${affectedDomain} service is currently unavailable. Other services may still be operational.`,
          retryAfter: 30,
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

// --- DDoS IP Blocking Store ---
// In-memory store: ip -> { count, windowStart, blockedUntil }
const ipStore = new Map<string, { count: number; windowStart: number; blockedUntil: number }>();
const DDOS_WINDOW_MS = 10_000;       // 10-second detection window
const DDOS_MAX_IN_WINDOW = 200;       // >200 requests in 10s = DDoS
const DDOS_BLOCK_DURATION_MS = 15 * 60 * 1000; // 15-minute block

function createDdosMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip DDoS blocking when VAPT mode is enabled (allow security scanners through)
    if (process.env.VAPT_MODE === 'true') return next();

    const ip = (req.headers['x-forwarded-for'] as string || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const now = Date.now();
    let entry = ipStore.get(ip);

    if (!entry) {
      entry = { count: 0, windowStart: now, blockedUntil: 0 };
      ipStore.set(ip, entry);
    }

    // Check if currently blocked
    if (now < entry.blockedUntil) {
      const remainingSecs = Math.ceil((entry.blockedUntil - now) / 1000);
      console.warn(`[DDOS] Blocked IP ${ip} attempted request. ${remainingSecs}s remaining.`);
      return res.status(429).json({
        error: 'ip_blocked',
        message: `Your IP has been temporarily blocked due to suspicious activity. Please try again in ${remainingSecs} seconds.`,
        retryAfter: remainingSecs,
      });
    }

    // Reset window if expired
    if (now - entry.windowStart > DDOS_WINDOW_MS) {
      entry.count = 0;
      entry.windowStart = now;
    }

    entry.count++;

    // Block if threshold exceeded
    if (entry.count > DDOS_MAX_IN_WINDOW) {
      entry.blockedUntil = now + DDOS_BLOCK_DURATION_MS;
      console.warn(`[DDOS] IP ${ip} blocked for 15 minutes after ${entry.count} requests in ${DDOS_WINDOW_MS / 1000}s.`);
      return res.status(429).json({
        error: 'ip_blocked',
        message: 'Your IP has been temporarily blocked due to excessive requests (DDoS protection). Try again in 15 minutes.',
        retryAfter: DDOS_BLOCK_DURATION_MS / 1000,
      });
    }

    next();
  };
}

// Periodically clean up expired block entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipStore.entries()) {
    if (now >= entry.blockedUntil && now - entry.windowStart > DDOS_WINDOW_MS * 2) {
      ipStore.delete(ip);
    }
  }
}, 5 * 60 * 1000); // cleanup every 5 minutes

async function bootstrap() {
  // IMPORTANT: bodyParser must be disabled on the gateway.
  // NestJS enables it by default, which consumes the raw request body stream before
  // http-proxy-middleware can forward it. This breaks multipart/form-data uploads
  // because Multer on the downstream service receives an empty buffer.
  const app = await NestFactory.create(GatewayAppModule, { bodyParser: false });

  const usersServiceUrl = process.env.USERS_SERVICE_URL || 'http://localhost:4101';
  const ticketingServiceUrl = process.env.TICKETING_SERVICE_URL || 'http://localhost:4102';
  const complianceServiceUrl = process.env.COMPLIANCE_SERVICE_URL || 'http://localhost:4103';
  const strictMode = (process.env.MICROSERVICES_STRICT || 'true').toLowerCase() !== 'false';

  app.use(helmet());

  // DDoS IP blocking (applied before rate limiting)
  app.use(createDdosMiddleware());

  // Attach/preserve correlation ID on every request so all downstream services
  // can trace a single frontend interaction through the logs.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    const requestId = (_req.headers['x-request-id'] as string | undefined)?.trim() || randomUUID();
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
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 1 * 60 * 1000),
      max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 4000),
      skip: () => process.env.VAPT_MODE === 'true',
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        console.warn(`[SECURITY] Rate limit exceeded by IP: ${req.ip}. Possible spam/DDoS attack.`);
        res.status(429).json({
          error: 'too_many_requests',
          message:
            'Security Measure Triggered: You have exceeded the maximum number of requests allowed. Please wait a minute before trying again.',
        });
      },
    }),
  );

  app.use(
    '/api/v1',
    rateLimit({
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 1 * 60 * 1000),
      max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 4000),
      skip: () => process.env.VAPT_MODE === 'true',
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        console.warn(`[SECURITY] Rate limit exceeded by IP: ${req.ip}. Possible spam/DDoS attack.`);
        res.status(429).json({
          error: 'too_many_requests',
          message:
            'Security Measure Triggered: You have exceeded the maximum number of requests allowed. Please wait a minute before trying again.',
        });
      },
    }),
  );

  const registerServiceRoutes = (prefix: '/api' | '/api/v1') => {
    app.use(`${prefix}/auth`, createServiceProxy(`${usersServiceUrl}/api/auth`, 'users'));
    app.use(`${prefix}/users`, createServiceProxy(`${usersServiceUrl}/api/users`, 'users'));
    app.use(`${prefix}/units`, createServiceProxy(`${usersServiceUrl}/api/units`, 'users'));
    app.use(
      `${prefix}/audit-logs`,
      createServiceProxy(`${usersServiceUrl}/api/audit-logs`, 'users'),
    );

    app.use(
      `${prefix}/tickets`,
      createServiceProxy(`${ticketingServiceUrl}/api/tickets`, 'ticketing'),
    );
    app.use(
      `${prefix}/attendance`,
      createServiceProxy(`${ticketingServiceUrl}/api/attendance`, 'ticketing'),
    );
    app.use(
      `${prefix}/ticket-settings`,
      createServiceProxy(`${ticketingServiceUrl}/api/ticket-settings`, 'ticketing'),
    );
    app.use(
      `${prefix}/knowledge-base`,
      createServiceProxy(`${ticketingServiceUrl}/api/knowledge-base`, 'ticketing'),
    );

    app.use(
      `${prefix}/documents`,
      createServiceProxy(`${complianceServiceUrl}/api/documents`, 'compliance'),
    );
    app.use(
      `${prefix}/document-types`,
      createServiceProxy(`${complianceServiceUrl}/api/document-types`, 'compliance'),
    );
    app.use(
      `${prefix}/comparisons`,
      createServiceProxy(`${complianceServiceUrl}/api/comparisons`, 'compliance'),
    );
    app.use(
      `${prefix}/issuances`,
      createServiceProxy(`${complianceServiceUrl}/api/issuances`, 'compliance'),
    );
    app.use(
      `${prefix}/metrics`,
      createServiceProxy(`${complianceServiceUrl}/api/metrics`, 'compliance'),
    );
    app.use(
      `${prefix}/incidents`,
      createServiceProxy(`${complianceServiceUrl}/api/incidents`, 'compliance'),
    );
    app.use(
      `${prefix}/cybersecurity`,
      createServiceProxy(`${complianceServiceUrl}/api/cybersecurity`, 'compliance'),
    );
    app.use(`${prefix}/kpi`, createServiceProxy(`${complianceServiceUrl}/api/kpi`, 'compliance'));
    app.use(`${prefix}/mov`, createServiceProxy(`${complianceServiceUrl}/api/mov`, 'compliance'));
    app.use(
      `${prefix}/compliance/role-capabilities`,
      createServiceProxy(`${usersServiceUrl}/api/users/role-capabilities`, 'users'),
    );
    app.use(`${prefix}/feedback`, createServiceProxy(`${usersServiceUrl}/api/feedback`, 'users'));

    app.use(`${prefix}/health`, async (_req: Request, res: Response) => {
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
        apiVersion: prefix === '/api/v1' ? 'v1' : 'legacy',
      });
    });
  };

  registerServiceRoutes('/api');
  registerServiceRoutes('/api/v1');

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

    app.use('/api/v1', (req: Request, res: Response) => {
      res.status(503).json({
        message: 'Service currently unavailable for this endpoint in microservices mode.',
        path: req.path,
        usersServiceUrl,
        ticketingServiceUrl,
        complianceServiceUrl,
      });
    });
  }

  await app.listen(Number(process.env.PORT || 4000), '0.0.0.0');
  console.log(`API Gateway running on http://localhost:${process.env.PORT || 4000}/api`);
}

bootstrap();
