import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { InternalServiceGuard } from '../../../common/guards/internal-service.guard';
import { EmailService } from '../services/email.service';

@ApiExcludeController()
@Controller('internal/auth-email-policy')
@UseGuards(InternalServiceGuard)
export class AuthEmailPolicyController {
  constructor(private readonly emailService: EmailService) {}

  @Get()
  async getPolicy(): Promise<{ outboundEmailsEnabled: boolean }> {
    return { outboundEmailsEnabled: await this.emailService.isAuthenticationEmailEnabled() };
  }
}
