import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Erlaubt der Vue-App (anderer Port/Adresse), das Backend anzusprechen.
  // Für den Start großzügig; vor dem Deploy schränken wir das auf die echte Adresse ein.
  app.enableCors();

  // Größeres Limit für JSON-Anfragen, damit eine PDF (als Text) durchpasst.
  app.useBodyParser('json', { limit: '15mb' });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
