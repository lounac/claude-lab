import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// Eingabe für POST /analyse/staerken.
// Die @MaxLength-Grenzen sind doppelt nützlich: sie validieren die Eingabe
// UND deckeln zugleich die an Claude geschickte Textmenge (Kostenbremse).
export class StaerkenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50_000)
  cvText: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  firma: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  position: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50_000)
  stellentext: string;

  @IsOptional()
  @IsString()
  @MaxLength(5_000)
  notizen?: string;
}
