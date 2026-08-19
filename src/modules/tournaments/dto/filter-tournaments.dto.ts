import { ApiPropertyOptional } from '@nestjs/swagger';
import { TournamentSpeed, TournamentType } from '@prisma/client';
import {
  IsOptional,
  IsString,
  IsInt,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FilterTournamentsDto {
  @ApiPropertyOptional({ example: 'PokerStars' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ example: 'Sunday' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: TournamentType })
  @IsOptional()
  @IsEnum(TournamentType)
  type?: TournamentType;

  @ApiPropertyOptional({ enum: TournamentSpeed })
  @IsOptional()
  @IsEnum(TournamentSpeed)
  speed?: TournamentSpeed;

  @ApiPropertyOptional({ example: 10, description: 'Minimum buy-in value' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minBuyIn?: number;

  @ApiPropertyOptional({ example: 500, description: 'Maximum buy-in value' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxBuyIn?: number;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
