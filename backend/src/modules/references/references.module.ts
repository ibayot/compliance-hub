import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issuance } from './entities/issuance.entity';
import { IssuanceService } from './services/issuance.service';
import { IssuanceController } from './controllers/issuance.controller';
import { Document } from '../documents/entities/document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Issuance, Document])],
  controllers: [IssuanceController],
  providers: [IssuanceService],
  exports: [IssuanceService],
})
export class ReferencesModule {}
