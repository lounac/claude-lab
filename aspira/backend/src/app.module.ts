import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyseModule } from './analyse/analyse.module';

@Module({
  imports: [
    // Liest die .env-Datei und stellt ihre Werte in der ganzen App bereit.
    ConfigModule.forRoot({ isGlobal: true }),
    // Unser neuer Bereich für die Stärken-Analyse.
    AnalyseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
