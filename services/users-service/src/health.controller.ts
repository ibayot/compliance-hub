import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return {
      service: 'users-service',
      status: 'ok',
      version: '0.0.2',
    };
  }
}
