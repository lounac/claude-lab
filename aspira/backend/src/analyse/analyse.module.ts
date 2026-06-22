import { Module } from '@nestjs/common';
import { AnalyseController } from './analyse.controller';
import { AnalyseService } from './analyse.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Module({
  controllers: [AnalyseController],
  providers: [AnalyseService, SupabaseAuthGuard],
})
export class AnalyseModule {}
