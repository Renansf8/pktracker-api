import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { IsNumberOrTicket } from 'src/shared/validators/is-number-or-ticket.validator';

export class CreateTournamentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  platform: string;

  @IsNotEmpty()
  @IsNumberOrTicket()
  buyIn: number | 'ticket';

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsOptional()
  @IsNumberOrTicket()
  result?: number | 'ticket';

  @IsBoolean()
  @IsNotEmpty()
  itm: boolean;

  @IsBoolean()
  @IsOptional()
  hasFt?: boolean;

  @IsNumber()
  @IsOptional()
  position?: number;

  @IsDateString()
  @IsNotEmpty()
  date: string;
}
