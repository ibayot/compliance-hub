import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());

  // CORS – echo back the request origin so both localhost and LAN IPs work
  const allowedOrigin = configService.get<string>('CORS_ORIGIN');
  app.enableCors({
    origin: allowedOrigin
      ? allowedOrigin.split(',').map((o) => o.trim())
      : true,          // true = mirrors request Origin header (safe for dev/internal)
    credentials: true,
    exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length'],
  });

  // API rate limiting
  app.use(
    '/api',
    rateLimit({
      windowMs: Number(configService.get('RATE_LIMIT_WINDOW_MS') || 15 * 60 * 1000),
      max: Number(configService.get('RATE_LIMIT_MAX_REQUESTS') || 300),
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        statusCode: 429,
        message: 'Too many requests. Please try again later.',
      },
    }),
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global serialization interceptor — applies @Exclude() / @Transform() on entity classes
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('RICTMS Compliance Hub API')
    .setDescription('API documentation for the Regional Internal Compliance Tracking and Metrics System')
    .setVersion('1.5.0.1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User authentication endpoints')
    .addTag('Documents', 'Document management and versioning')
    .addTag('Issuances', 'Government compliance issuances')
    .addTag('Tickets', 'Issue documentation system')
    .addTag('Units', 'Organizational units management')
    .addTag('Metrics', 'Compliance metrics and templates')
    .addTag('Reviews', 'Manual compliance reviews')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get('PORT') || 4000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
