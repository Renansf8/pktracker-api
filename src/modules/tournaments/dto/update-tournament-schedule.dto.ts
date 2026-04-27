import { PartialType } from '@nestjs/mapped-types';
import { CreateTournamentScheduleDto } from './create-tournament-schedule.dto';

export class UpdateTournamentScheduleDto extends PartialType(
  CreateTournamentScheduleDto,
) {}
