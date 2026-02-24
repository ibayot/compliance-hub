import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issuance } from './entities/issuance.entity';
import { IssuanceService } from './services/issuance.service';
import { IssuanceController } from './controllers/issuance.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Issuance])],
  controllers: [IssuanceController],
  providers: [IssuanceService],
  exports: [IssuanceService],
})
export class ReferencesModule {}
