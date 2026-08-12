import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import * as Joi from 'joi';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { UnitsModule } from './modules/units/units.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ReferencesModule } from './modules/references/references.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { CybersecurityModule } from './modules/cybersecurity/cybersecurity.module';
import { KpiModule } from './modules/kpi/kpi.module';
import { MovModule } from './modules/mov/mov.module';
import { AuditModule } from './modules/audit/audit.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './shared/audit/audit.interceptor';
import { AuditVariableSubscriber } from './shared/audit/audit.subscriber';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().default(4000),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(3306),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().allow('').optional(),
        DB_DATABASE: Joi.string().required(),
        DB_SYNCHRONIZE: Joi.boolean().default(false),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().default(6379),
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_REFRESH_SECRET: Joi.string().min(16).required(),
        JWT_ISSUER: Joi.string().default('compliance-hub-api'),
        JWT_AUDIENCE: Joi.string().default('compliance-hub-client'),
        GOOGLE_CLIENT_ID: Joi.string().allow('').optional(),
        GOOGLE_CLIENT_SECRET: Joi.string().allow('').optional(),
        GOOGLE_CALLBACK_URL: Joi.string().allow('').optional(),
        FRONTEND_URL: Joi.string().allow('').optional(),
        CORS_ORIGIN: Joi.string().required(),
        RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000),
        RATE_LIMIT_MAX_REQUESTS: Joi.number().default(1000),
        DB_LOGGING: Joi.boolean().default(false),
      }),
    }),

    // Scheduler for cron jobs
    ScheduleModule.forRoot(),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isDevelopment = configService.get('NODE_ENV') === 'development';
        const synchronizeFromEnv = configService.get<boolean>('DB_SYNCHRONIZE');

        return {
          type: 'mysql',
          host: configService.get('DB_HOST'),
          port: configService.get('DB_PORT'),
          username: configService.get('DB_USERNAME'),
          password: configService.get('DB_PASSWORD'),
          database: configService.get('DB_DATABASE'),
          autoLoadEntities: true,
          synchronize: isDevelopment && Boolean(synchronizeFromEnv),
          logging: true, // HARDCODED TO TRUE FOR DEBUGGING
        };
      },
    }),

    // Redis/Bull Queue
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

    // Feature modules
    AuthModule,
    UsersModule,
    UnitsModule,
    DocumentsModule,
    MetricsModule,
    ReviewsModule,
    ReferencesModule,
    TicketsModule,
    IncidentsModule,
    CybersecurityModule,
    KpiModule,
    MovModule,
    AuditModule,
  ],
  controllers: [],
  providers: [
    AuditVariableSubscriber,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
