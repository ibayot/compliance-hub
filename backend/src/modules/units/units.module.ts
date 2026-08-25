import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitsService } from './units.service';
import { UnitsController } from './units.controller';
import { Unit } from './entities/unit.entity';
import { UsersModule } from '../users/users.module';
import { CapabilityGuard } from '../../common/guards/capability.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Unit]), UsersModule],
  controllers: [UnitsController],
  providers: [UnitsService, CapabilityGuard],
  exports: [UnitsService],
})
export class UnitsModule {}