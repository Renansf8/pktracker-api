import { Module } from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';
import { TournamentsRepository } from 'src/database/repositories/tournaments.repository';
import { BanksRepository } from 'src/database/repositories/banks.repositories';
import { TournamentScheduleItemsController } from './tournament-schedule-items.controller';
import { TournamentScheduleItemsService } from './tournament-schedule-items.service';
import { TournamentScheduleItemsRepository } from 'src/database/repositories/tournament-schedule-items.repository';

@Module({
  controllers: [TournamentsController, TournamentScheduleItemsController],
  providers: [
    TournamentsService,
    TournamentsRepository,
    BanksRepository,
    TournamentScheduleItemsService,
    TournamentScheduleItemsRepository,
  ],
})
export class TournamentsModule {}
