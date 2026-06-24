import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Eingabe für POST /analyse/verfeinern (Analyse mit den Antworten verfeinern).
export class VerfeinernDto {
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

  @IsString()
  @IsNotEmpty()
  @MaxLength(20_000)
  vorherigeAnalyse: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000)
  antworten: string;
}
