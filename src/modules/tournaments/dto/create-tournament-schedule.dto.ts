import { ApiProperty } from '@nestjs/swagger';
import { ScheduleType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateTournamentScheduleDto {
  @ApiProperty({ example: 'Weekday Grind' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ScheduleType, example: ScheduleType.WEEKLY })
  @IsEnum(ScheduleType)
  @IsNotEmpty()
  type: ScheduleType;
}
