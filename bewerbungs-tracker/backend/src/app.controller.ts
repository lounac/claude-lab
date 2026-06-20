import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Neuer Endpunkt: GET /health → ruft den Service auf, gibt JSON zurück.
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }
}
