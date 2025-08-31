import { IsDateString, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateTournamentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  platform: string;

  @IsNumber()
  @IsNotEmpty()
  buyIn: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsNumber()
  @IsNotEmpty()
  result: number;

  profit: number;

  @IsDateString()
  @IsNotEmpty()
  date: string;
}
