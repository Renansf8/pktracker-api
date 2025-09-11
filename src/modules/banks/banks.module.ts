import { Module } from '@nestjs/common';
import { BanksController } from './banks.controller';
import { BanksService } from './banks.service';
import { BanksRepository } from '../../database/repositories/banks.repositories';

@Module({
  controllers: [BanksController],
  providers: [BanksService, BanksRepository],
})
export class BanksModule {}
