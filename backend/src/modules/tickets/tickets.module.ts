import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketService } from './services/ticket.service';
import { TicketController } from './controllers/ticket.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketComment])],
  controllers: [TicketController],
  providers: [TicketService],
  exports: [TicketService],
})
export class TicketsModule {}
