process.env.DB_PORT = '3307';
process.env.GROQ_API_KEY = 'YOUR_GROQ_API_KEY';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TicketService } from './modules/tickets/services/ticket.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const ticketService = app.get(TicketService);

  console.log('Setting ticket isKbGenerationPending = true...');
  await ticketService['ticketRepo'].update('fa5c85da-eebf-443a-bb65-337ab036ac48', { isKbGenerationPending: true });
  
  console.log('Running retryBenchedKbs()...');
  await ticketService.retryBenchedKbs();
  
  console.log('Done! KB should be generated.');
  await app.close();
  process.exit(0);
}
bootstrap();
