import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

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
  @IsOptional()
  result?: number;

  @IsBoolean()
  @IsNotEmpty()
  itm: boolean;

  @IsNumber()
  @IsOptional()
  position?: number;

  @IsDateString()
  @IsNotEmpty()
  date: string;
}
