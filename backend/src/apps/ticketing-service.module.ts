import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import * as Joi from 'joi';
import { TicketsModule } from '../modules/tickets/tickets.module';
import { TicketingJwtStrategy } from './ticketing-jwt.strategy';
import { HttpClientsModule } from '../common/http-clients/http-clients.module';
import { CorrelationIdMiddleware } from '../common/middleware/correlation-id.middleware';

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
          'compliance_hub_ticketing',
        autoLoadEntities: true,
        synchronize: false,
        logging: Boolean(configService.get<boolean>('DB_LOGGING')),
      }),
    }),
    PassportModule,
    TicketsModule,
    HttpClientsModule,
  ],
  providers: [TicketingJwtStrategy],
})
export class TicketingServiceAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
