import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CybersecurityMetric } from './entities/cybersecurity-metric.entity';
import { CybersecurityController } from './controllers/cybersecurity.controller';
import { CybersecurityService } from './services/cybersecurity.service';

@Module({
  imports: [TypeOrmModule.forFeature([CybersecurityMetric])],
  controllers: [CybersecurityController],
  providers: [CybersecurityService],
  exports: [CybersecurityService],
})
export class CybersecurityModule {}
