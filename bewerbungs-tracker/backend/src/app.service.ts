import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  // Liefert ein einfaches "Lebenszeichen" zurück (Status + aktuelle Uhrzeit).
  getHealth() {
    return {
      status: 'ok',
      zeit: new Date().toISOString(),
    };
  }
}
