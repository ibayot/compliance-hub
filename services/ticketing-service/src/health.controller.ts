import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return {
      service: 'ticketing-service',
      status: 'ok',
      version: '0.0.2',
    };
  }
}
