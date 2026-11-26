import { Module } from '@nestjs/common';
import { HttpClientsModule } from '../../common/http-clients/http-clients.module';
import { DemoJwtStrategy } from './demo-jwt.strategy';
import { DemoTicketFiles } from './demo-ticket-files';
import { DemoTicketStore } from './demo-ticket-store';
import { DemoTicketsController } from './demo-tickets.controller';
import { DemoTicketsService } from './demo-tickets.service';

@Module({
  imports: [HttpClientsModule],
  controllers: [DemoTicketsController],
  providers: [DemoJwtStrategy, DemoTicketStore, DemoTicketFiles, DemoTicketsService],
})
export class DemoTicketsModule {}
