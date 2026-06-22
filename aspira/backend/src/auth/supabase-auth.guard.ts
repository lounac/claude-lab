import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * Türsteher (Guard) für die Analyse-Endpunkte.
 *
 * Bei jedem Aufruf prüft er, ob ein gültiger Supabase-Login-Token
 * mitgeschickt wurde. Nur dann darf die (kostenpflichtige) KI laufen.
 * Ohne / mit ungültigem Token → 401 (Unauthorized).
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers['authorization'];

    // 1) Steht überhaupt ein "Bearer <token>" im Header?
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Kein Login-Token vorhanden.');
    }
    const token = header.slice('Bearer '.length).trim();

    // 2) Konfiguration vorhanden? (Adresse + öffentlicher anon-Schlüssel)
    const url = this.config.get<string>('SUPABASE_URL');
    const anonKey = this.config.get<string>('SUPABASE_ANON_KEY');
    if (!url || !anonKey) {
      throw new UnauthorizedException(
        'Server ist für die Login-Prüfung nicht konfiguriert.',
      );
    }

    // 3) Bei Supabase nachfragen: Ist dieser Token echt und gültig?
    try {
      const res = await fetch(`${url}/auth/v1/user`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new UnauthorizedException('Login-Token ungültig oder abgelaufen.');
      }
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Login konnte nicht geprüft werden.');
    }

    return true;
  }
}
