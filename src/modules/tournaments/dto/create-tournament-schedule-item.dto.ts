import { IsNotEmpty, IsNumber, IsString, Matches } from 'class-validator';

export class CreateTournamentScheduleItemDto {
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

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'time must be in HH:mm format',
  })
  time: string;
}

