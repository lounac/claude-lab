import { Body, Controller, Post } from '@nestjs/common';
import { AnalyseService } from './analyse.service';
import type { StaerkenEingabe, VerfeinernEingabe } from './analyse.service';

@Controller('analyse')
export class AnalyseController {
  constructor(private readonly analyseService: AnalyseService) {}

  // POST /analyse/staerken → erste Analyse
  @Post('staerken')
  async staerken(@Body() body: StaerkenEingabe) {
    return this.analyseService.staerkenAnalyse(body);
  }

  // POST /analyse/verfeinern → Analyse mit den Antworten verfeinern
  @Post('verfeinern')
  async verfeinern(@Body() body: VerfeinernEingabe) {
    return this.analyseService.verfeinern(body);
  }
}
