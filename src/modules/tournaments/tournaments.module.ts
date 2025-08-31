import { Module } from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';
import { TournamentsRepository } from 'src/database/repositories/tournaments.repository';
import { BanksRepository } from 'src/database/repositories/banks.repositories';

@Module({
  controllers: [TournamentsController],
  providers: [TournamentsService, TournamentsRepository, BanksRepository],
})
export class TournamentsModule {}
