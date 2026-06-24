import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AnalyseService } from './analyse.service';

// Den Anthropic-SDK-Aufruf mocken, damit kein echter (teurer) Claude-Call passiert.
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

describe('AnalyseService', () => {
  let service: AnalyseService;

  beforeEach(async () => {
    mockCreate.mockReset();
    const module = await Test.createTestingModule({
      providers: [
        AnalyseService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-key') },
        },
      ],
    }).compile();
    service = module.get(AnalyseService);
  });

  it('zerlegt die Antwort in Analyse, Lücken und berechnet die Kosten', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Meine Analyse\n===LÜCKEN===\nwichtig|NestJS' }],
      usage: { input_tokens: 2000, output_tokens: 1000 },
    });

    const ergebnis = await service.staerkenAnalyse({
      cvText: 'Mein CV',
      firma: 'MULTIVAC',
      position: 'Software Developer',
      stellentext: 'NestJS, Vue',
    });

    expect(ergebnis.analyse).toBe('Meine Analyse');
    expect(ergebnis.luecken).toBe('wichtig|NestJS');
    expect(ergebnis.kosten.eingabeTokens).toBe(2000);
    expect(ergebnis.kosten.ausgabeTokens).toBe(1000);
    // 2000 * 3/1e6 + 1000 * 15/1e6 = 0.006 + 0.015 = 0.021
    expect(ergebnis.kosten.usd).toBe(0.021);
  });

  it('schickt Modell, max_tokens und alle Eingaben an Claude', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'x' }],
      usage: { input_tokens: 1, output_tokens: 1 },
    });

    await service.staerkenAnalyse({
      cvText: 'CV-INHALT',
      firma: 'FIRMA-X',
      position: 'POSITION-Y',
      stellentext: 'STELLE-Z',
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const arg = mockCreate.mock.calls[0][0];
    expect(arg.model).toBe('claude-sonnet-4-6');
    expect(arg.max_tokens).toBe(1500);
    const prompt: string = arg.messages[0].content;
    expect(prompt).toContain('CV-INHALT');
    expect(prompt).toContain('FIRMA-X');
    expect(prompt).toContain('POSITION-Y');
    expect(prompt).toContain('STELLE-Z');
  });

  it('liefert leere Lücken, wenn der Marker fehlt', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Nur Analyse, keine Lücken' }],
      usage: { input_tokens: 10, output_tokens: 10 },
    });

    const ergebnis = await service.staerkenAnalyse({
      cvText: 'a',
      firma: 'b',
      position: 'c',
      stellentext: 'd',
    });

    expect(ergebnis.luecken).toBe('');
  });

  it('wirft einen sauberen Fehler, wenn Claude fehlschlägt', async () => {
    mockCreate.mockRejectedValue(new Error('API down'));
    await expect(
      service.staerkenAnalyse({ cvText: 'a', firma: 'b', position: 'c', stellentext: 'd' }),
    ).rejects.toThrow(
      'Die KI-Analyse ist gerade nicht möglich. Bitte später erneut versuchen.',
    );
  });

  it('verfeinern arbeitet bisherige Analyse + Antworten in den Prompt ein', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Verfeinert' }],
      usage: { input_tokens: 5, output_tokens: 5 },
    });

    await service.verfeinern({
      cvText: 'cv',
      firma: 'f',
      position: 'p',
      stellentext: 's',
      vorherigeAnalyse: 'ALTE-ANALYSE',
      antworten: 'MEINE-ANTWORTEN',
    });

    const prompt: string = mockCreate.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain('ALTE-ANALYSE');
    expect(prompt).toContain('MEINE-ANTWORTEN');
  });
});
