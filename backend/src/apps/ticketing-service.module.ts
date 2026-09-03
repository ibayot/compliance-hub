import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import * as Joi from 'joi';
import { ScheduleModule } from '@nestjs/schedule';
import { TicketsModule } from '../modules/tickets/tickets.module';
import { TicketingJwtStrategy } from './ticketing-jwt.strategy';
import { HttpClientsModule } from '../common/http-clients/http-clients.module';
import { CorrelationIdMiddleware } from '../common/middleware/correlation-id.middleware';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from '../shared/audit/audit.interceptor';
import { AuditVariableSubscriber } from '../shared/audit/audit.subscriber';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().default(4102),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(3306),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().allow('').optional(),
        DB_DATABASE: Joi.string().required(),
        TICKETING_DB_DATABASE: Joi.string().optional(),
        DB_SYNCHRONIZE: Joi.boolean().default(false),
        JWT_SECRET: Joi.string().min(16).required(),
        CORS_ORIGIN: Joi.string().required(),
        AUDIT_DB_DATABASE: Joi.string().pattern(/^[A-Za-z0-9_]+$/).required(),
        AUTH_ACCESS_COOKIE_NAME: Joi.string().pattern(/^[A-Za-z0-9_-]+$/).invalid('auth_access').required(),
        AUTH_REFRESH_COOKIE_NAME: Joi.string().pattern(/^[A-Za-z0-9_-]+$/).invalid('auth_refresh').required(),
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
          configService.get('TICKETING_DB_DATABASE') ||
          '02_db_compliance_hub_ticketing_prod',
        timezone: '+08:00',
        autoLoadEntities: true,
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE'),
        logging: Boolean(configService.get<boolean>('DB_LOGGING')),
      }),
    }),
    ScheduleModule.forRoot(),
    PassportModule,
    TicketsModule,
    HttpClientsModule,
  ],
  providers: [
    TicketingJwtStrategy,
    AuditVariableSubscriber,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class TicketingServiceAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
