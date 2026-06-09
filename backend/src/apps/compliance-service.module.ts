import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { PassportModule } from '@nestjs/passport';
import * as Joi from 'joi';
import { DocumentsModule } from '../modules/documents/documents.module';
import { MetricsModule } from '../modules/metrics/metrics.module';
import { ReviewsModule } from '../modules/reviews/reviews.module';
import { ReferencesModule } from '../modules/references/references.module';
import { IncidentsModule } from '../modules/incidents/incidents.module';
import { CybersecurityModule } from '../modules/cybersecurity/cybersecurity.module';
import { KpiModule } from '../modules/kpi/kpi.module';
import { MovModule } from '../modules/mov/mov.module';
import { ComplianceJwtStrategy } from './compliance-jwt.strategy';
import { HttpClientsModule } from '../common/http-clients/http-clients.module';
import { CorrelationIdMiddleware } from '../common/middleware/correlation-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().default(4103),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(3306),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().allow('').optional(),
        DB_DATABASE: Joi.string().required(),
        COMPLIANCE_DB_DATABASE: Joi.string().optional(),
        DB_SYNCHRONIZE: Joi.boolean().default(false),
        DB_LOGGING: Joi.boolean().default(false),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().default(6379),
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_ISSUER: Joi.string().default('compliance-hub-api'),
        JWT_AUDIENCE: Joi.string().default('compliance-hub-client'),
        CORS_ORIGIN: Joi.string().required(),
        RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000),
        RATE_LIMIT_MAX_REQUESTS: Joi.number().default(1000),
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database:
          configService.get('COMPLIANCE_DB_DATABASE') ||
          'compliance_hub',
        autoLoadEntities: true,
        synchronize: false,
        logging: Boolean(configService.get<boolean>('DB_LOGGING')),
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          maxRetriesPerRequest: null,
        },
      }),
    }),
    PassportModule,
    DocumentsModule,
    MetricsModule,
    ReviewsModule,
    ReferencesModule,
    IncidentsModule,
    CybersecurityModule,
    KpiModule,
    MovModule,
    HttpClientsModule,
  ],
  providers: [ComplianceJwtStrategy],
})
export class ComplianceServiceAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
