import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketIssueType } from './entities/ticket-issue-type.entity';
import { TicketCategoryConfig } from './entities/ticket-category.entity';
import { TicketService } from './services/ticket.service';
import { TicketController } from './controllers/ticket.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket,
      TicketComment,
      TicketIssueType,
      TicketCategoryConfig,
    ]),
  ],
  controllers: [TicketController],
  providers: [TicketService],
  exports: [TicketService],
})
export class TicketsModule {}
