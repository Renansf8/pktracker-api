import { ScheduleType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateTournamentScheduleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ScheduleType)
  @IsNotEmpty()
  type: ScheduleType;
}
