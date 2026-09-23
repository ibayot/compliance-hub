import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppRelease, AppReleaseDelivery, AppReleaseNote } from './changelog.entity';
import { User } from '../users/entities/user.entity';
import { RoleCapability } from '../users/entities/role-capability.entity';
import { ChangelogService } from './changelog.service';
import { ChangelogController } from './changelog.controller';
import { UsersModule } from '../users/users.module';
import { CapabilityGuard } from '../../common/guards/capability.guard';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppRelease,
      AppReleaseNote,
      AppReleaseDelivery,
      User,
      RoleCapability,
    ]),
    UsersModule,
  ],
  controllers: [ChangelogController],
  providers: [ChangelogService, CapabilityGuard],
})
export class ChangelogModule {}
