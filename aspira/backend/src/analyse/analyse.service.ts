import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

// Eingabe für die erste Stärken-Analyse.
export interface StaerkenEingabe {
  cvText: string; // der bereits aus der PDF ausgelesene Lebenslauf-Text
  firma: string;
  position: string;
  stellentext: string; // die Stellenbeschreibung (Pflicht – Vergleichsbasis)
  notizen?: string; // optionale Notizen zur Stelle
}

// Eingabe für die Verfeinerung (Antworten auf die Rückfragen).
export interface VerfeinernEingabe {
  cvText: string;
  firma: string;
  position: string;
  stellentext: string;
  vorherigeAnalyse: string; // die bisherige Analyse
  antworten: string; // die Antworten der Bewerberin auf die Rückfragen
}

const MODELL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1500; // deckelt die Antwortlänge (Kostenbremse)

// Preise pro 1 Mio. Tokens in US-Dollar (Sonnet 4.6).
const PREIS_INPUT = 3 / 1_000_000;
const PREIS_OUTPUT = 15 / 1_000_000;

@Injectable()
export class AnalyseService {
  private readonly anthropic: Anthropic;

  constructor(private readonly config: ConfigService) {
    this.anthropic = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  // Gemeinsamer Claude-Aufruf: Auftrag rein → Analyse-Text + Kosten raus.
  private async aufruf(auftrag: string) {
    try {
      const antwort = await this.anthropic.messages.create({
        model: MODELL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: auftrag }],
      });

      const text = antwort.content
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('');

      const usd =
        antwort.usage.input_tokens * PREIS_INPUT +
        antwort.usage.output_tokens * PREIS_OUTPUT;

      // Text in Analyse + kompakte Lücken-Liste trennen (Marker steht im Prompt).
      const teile = text.split('===LÜCKEN===');
      const analyse = teile[0].trim();
      const luecken = (teile[1] ?? '').trim();

      return {
        analyse,
        luecken,
        kosten: {
          eingabeTokens: antwort.usage.input_tokens,
          ausgabeTokens: antwort.usage.output_tokens,
          usd: Number(usd.toFixed(4)),
        },
      };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      // Fehlender Key, Netzwerk- oder API-Fehler → sauberer Fehler statt Stacktrace.
      throw new HttpException(
        'Die KI-Analyse ist gerade nicht möglich. Bitte später erneut versuchen.',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async staerkenAnalyse(eingabe: StaerkenEingabe) {
    const auftrag =
      `Hier ist der Lebenslauf einer Bewerberin (aus ihrem CV ausgelesen):\n\n` +
      `"""\n${eingabe.cvText}\n"""\n\n` +
      `Sie bewirbt sich auf folgende Stelle:\n` +
      `- Firma: ${eingabe.firma}\n` +
      `- Position: ${eingabe.position}\n\n` +
      `Stellenbeschreibung / Anforderungen:\n` +
      `"""\n${eingabe.stellentext}\n"""\n` +
      (eingabe.notizen
        ? `\nZusätzliche Notizen der Bewerberin: ${eingabe.notizen}\n`
        : '') +
      `\nGleiche das Profil GEGEN DIESE STELLE ab und erstelle eine kurze, ehrliche ` +
      `Stärken-Analyse auf Deutsch mit genau diesen Abschnitten:\n` +
      `1. **Passende Stärken** – wo der Lebenslauf die Anforderungen der Stelle erfüllt (Stichpunkte).\n` +
      `2. **Mögliche Lücken** – welche Anforderungen der Stelle im Lebenslauf (noch) nicht belegt sind.\n` +
      `3. **Offene Rückfragen** – konkrete Fragen zu Dingen, die im Lebenslauf fehlen oder unklar sind ` +
      `und die die Bewerbung für genau diese Stelle stärken würden.\n\n` +
      `Fasse dich knapp und konkret. Erfinde nichts, was nicht im Lebenslauf steht.\n\n` +
      `Liste danach die „Mögliche Lücken" nach einer eigenen Zeile auf, die EXAKT ===LÜCKEN=== lautet. ` +
      `Schreibe jede Lücke in GENAU EINE Zeile im Format Wichtigkeit|Text – Wichtigkeit ist dabei ` +
      `exakt „wichtig" (Muss-Anforderung der Stelle) oder „nice-to-have" (wünschenswert). ` +
      `Beispiel: wichtig|Praktische Erfahrung mit NestJS. ` +
      `Keine Aufzählungszeichen, keine Klammern, keine weitere Formatierung. Wichtigste Punkte zuerst.`;

    return this.aufruf(auftrag);
  }

  async verfeinern(eingabe: VerfeinernEingabe) {
    const auftrag =
      `Hier ist der Lebenslauf einer Bewerberin:\n"""\n${eingabe.cvText}\n"""\n\n` +
      `Stelle: ${eingabe.firma} – ${eingabe.position}. Stellenbeschreibung:\n` +
      `"""\n${eingabe.stellentext}\n"""\n\n` +
      `Es gibt bereits eine erste Stärken-Analyse:\n` +
      `"""\n${eingabe.vorherigeAnalyse}\n"""\n\n` +
      `Die Bewerberin hat die offenen Rückfragen so beantwortet bzw. ergänzt:\n` +
      `"""\n${eingabe.antworten}\n"""\n\n` +
      `Aktualisiere die Stärken-Analyse auf Deutsch und arbeite diese Antworten ein. ` +
      `Behalte die drei Abschnitte (Passende Stärken / Mögliche Lücken / Offene Rückfragen). ` +
      `Schließe Lücken, wo die Antworten das hergeben, und stelle nur noch wirklich offene Rückfragen.\n\n` +
      `Liste danach die „Mögliche Lücken" nach einer eigenen Zeile auf, die EXAKT ===LÜCKEN=== lautet. ` +
      `Schreibe jede Lücke in GENAU EINE Zeile im Format Wichtigkeit|Text – Wichtigkeit ist dabei ` +
      `exakt „wichtig" (Muss-Anforderung der Stelle) oder „nice-to-have" (wünschenswert). ` +
      `Beispiel: wichtig|Praktische Erfahrung mit NestJS. ` +
      `Keine Aufzählungszeichen, keine Klammern, keine weitere Formatierung. Wichtigste Punkte zuerst.`;

    return this.aufruf(auftrag);
  }
}
