import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Matches } from 'class-validator';

export class CreateTournamentScheduleItemDto {
  @ApiProperty({ example: 'Sunday Million' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'PokerStars' })
  @IsString()
  @IsNotEmpty()
  platform: string;

  @ApiProperty({ example: 215 })
  @IsNumber()
  @IsNotEmpty()
  buyIn: number;

  @ApiProperty({ example: 'USD' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ example: '20:00', description: 'Time in HH:mm format' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'time must be in HH:mm format',
  })
  time: string;
}
