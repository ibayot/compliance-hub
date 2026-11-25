import { NestFactory } from '@nestjs/core';
import { TicketingServiceAppModule } from './apps/ticketing-service.module';
import { KnowledgeBaseService } from './modules/tickets/services/knowledge-base.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(TicketingServiceAppModule);
  try {
    await app.get(KnowledgeBaseService).retryPendingGenerations();
  } finally {
    await app.close();
  }
}
void bootstrap();
