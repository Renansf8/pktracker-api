import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ example: 'Sunday Million' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'PokerStars' })
  @IsString()
  @IsNotEmpty()
  platform: string;

  @ApiProperty({ example: 22, description: 'Buy-in value or "ticket"' })
  @IsNotEmpty()
  @IsNumberOrTicket()
  buyIn: number | 'ticket';

  @ApiProperty({ example: 'USD' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiPropertyOptional({ example: 150, description: 'Result amount or "ticket"' })
  @IsOptional()
  @IsNumberOrTicket()
  result?: number | 'ticket';

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsNotEmpty()
  itm: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  hasFt?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  hasSecondDay?: boolean;

  @ApiPropertyOptional({ example: 12 })
  @IsNumber()
  @IsOptional()
  position?: number;

  @ApiProperty({ example: '2025-05-13T20:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  date: string;
}
