import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseAuthGuard } from './supabase-auth.guard';

// Baut einen minimalen ExecutionContext mit den gegebenen Request-Headern.
function ctxMit(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

describe('SupabaseAuthGuard', () => {
  const config = {
    get: jest.fn((key: string) =>
      key === 'SUPABASE_URL' ? 'https://x.supabase.co' : 'anon-key',
    ),
  } as unknown as ConfigService;
  let guard: SupabaseAuthGuard;

  beforeEach(() => {
    guard = new SupabaseAuthGuard(config);
    global.fetch = jest.fn();
  });

  it('weist ab, wenn kein Bearer-Token vorhanden ist', async () => {
    await expect(guard.canActivate(ctxMit({}))).rejects.toThrow(
      'Kein Login-Token vorhanden.',
    );
  });

  it('weist ab, wenn der Header kein Bearer ist', async () => {
    await expect(
      guard.canActivate(ctxMit({ authorization: 'Basic abc' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('weist ab, wenn die Server-Konfiguration fehlt', async () => {
    const leererConfig = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const g = new SupabaseAuthGuard(leererConfig);
    await expect(
      g.canActivate(ctxMit({ authorization: 'Bearer x' })),
    ).rejects.toThrow('Server ist für die Login-Prüfung nicht konfiguriert.');
  });

  it('lässt durch und fragt Supabase, wenn der Token gültig ist', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    const erlaubt = await guard.canActivate(
      ctxMit({ authorization: 'Bearer gueltig' }),
    );

    expect(erlaubt).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://x.supabase.co/auth/v1/user',
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: 'anon-key',
          Authorization: 'Bearer gueltig',
        }),
      }),
    );
  });

  it('weist ab, wenn Supabase den Token ablehnt', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
    await expect(
      guard.canActivate(ctxMit({ authorization: 'Bearer ungueltig' })),
    ).rejects.toThrow('Login-Token ungültig oder abgelaufen.');
  });

  it('weist ab, wenn die Prüfung selbst fehlschlägt (Netzwerk)', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));
    await expect(
      guard.canActivate(ctxMit({ authorization: 'Bearer x' })),
    ).rejects.toThrow('Login konnte nicht geprüft werden.');
  });
});
