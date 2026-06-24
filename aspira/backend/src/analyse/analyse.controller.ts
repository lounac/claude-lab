import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AnalyseService } from './analyse.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { StaerkenDto } from './dto/staerken.dto';
import { VerfeinernDto } from './dto/verfeinern.dto';

// Der Türsteher gilt für ALLE Endpunkte in diesem Controller:
// ohne gültigen Login-Token kommt niemand zur Analyse durch.
@Controller('analyse')
@UseGuards(SupabaseAuthGuard)
export class AnalyseController {
  constructor(private readonly analyseService: AnalyseService) {}

  // POST /analyse/staerken → erste Analyse
  @Post('staerken')
  async staerken(@Body() body: StaerkenDto) {
    return this.analyseService.staerkenAnalyse(body);
  }

  // POST /analyse/verfeinern → Analyse mit den Antworten verfeinern
  @Post('verfeinern')
  async verfeinern(@Body() body: VerfeinernDto) {
    return this.analyseService.verfeinern(body);
  }
}
