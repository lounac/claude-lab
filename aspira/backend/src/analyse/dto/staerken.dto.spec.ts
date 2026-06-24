import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { StaerkenDto } from './staerken.dto';

describe('StaerkenDto-Validierung', () => {
  const gueltig = { cvText: 'cv', firma: 'f', position: 'p', stellentext: 's' };

  it('akzeptiert eine vollständige Eingabe', async () => {
    const dto = plainToInstance(StaerkenDto, gueltig);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('lehnt leere Pflichtfelder ab', async () => {
    const dto = plainToInstance(StaerkenDto, {
      cvText: '',
      firma: '',
      position: '',
      stellentext: '',
    });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });

  it('lehnt zu langen cvText ab (Kostenbremse greift)', async () => {
    const dto = plainToInstance(StaerkenDto, {
      ...gueltig,
      cvText: 'x'.repeat(60_000),
    });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });

  it('erlaubt das optionale Notizen-Feld', async () => {
    const dto = plainToInstance(StaerkenDto, {
      ...gueltig,
      notizen: 'kurze Notiz',
    });
    expect(await validate(dto)).toHaveLength(0);
  });
});
