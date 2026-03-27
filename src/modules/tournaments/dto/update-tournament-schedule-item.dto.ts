import { PartialType } from '@nestjs/mapped-types';
import { CreateTournamentScheduleItemDto } from './create-tournament-schedule-item.dto';

export class UpdateTournamentScheduleItemDto extends PartialType(
  CreateTournamentScheduleItemDto,
) {}

