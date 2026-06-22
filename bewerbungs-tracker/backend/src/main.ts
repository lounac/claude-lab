import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // CORS: legt fest, WELCHE Webseiten das Backend ansprechen dürfen.
  // - Lokal: die Vue-Dev-Adresse (5173) und die Vite-Vorschau (4173).
  // - Online: die echte App-Adresse aus der Umgebungsvariable FRONTEND_URL
  //   (mehrere durch Komma trennbar, z. B. Produktion + eigene Domain).
  const erlaubteOrigins = ['http://localhost:5173', 'http://localhost:4173'];
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) {
    for (const o of frontendUrl.split(',')) {
      const sauber = o.trim();
      if (sauber) erlaubteOrigins.push(sauber);
    }
  }
  app.enableCors({
    origin: erlaubteOrigins,
    methods: ['GET', 'POST'],
  });

  // Größeres Limit für JSON-Anfragen, damit eine PDF (als Text) durchpasst.
  app.useBodyParser('json', { limit: '15mb' });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
