import { Injectable } from '@nestjs/common';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentsRepository } from 'src/database/repositories/tournaments.repository';
import { BanksRepository } from 'src/database/repositories/banks.repositories';

@Injectable()
export class TournamentsService {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly banksRepository: BanksRepository,
  ) {}

  async create(userId: string, createTournamentDto: CreateTournamentDto) {
    const bank = await this.banksRepository.findByUserId(userId);

    if (!bank) {
      throw new Error('Bank not found for this user');
    }

    const tournament = await this.tournamentsRepository.create({
      name: createTournamentDto.name,
      platform: createTournamentDto.platform,
      buyIn: createTournamentDto.buyIn,
      currency: createTournamentDto.currency,
      result: createTournamentDto.result.toString(),
      profit: createTournamentDto.result - createTournamentDto.buyIn,
      date: new Date(createTournamentDto.date),
      user: {
        connect: { id: userId },
      },
      bank: {
        connect: { id: bank.id },
      },
    });

    // Update bank with tournament results
    await this.banksRepository.update(bank.id, {
      bank: bank.bank + tournament.profit,
      profit: bank.profit + tournament.profit,
    });

    return tournament;
  }

  findAll(userId: string, filters?: { platform?: string }) {
    return this.tournamentsRepository.findMany({
      where: {
        userId,
        ...(filters?.platform && { platform: filters.platform }),
      },
      orderBy: { date: 'desc' },
    });
  }

  findOne(userId: string, id: string) {
    return this.tournamentsRepository.findUnique({
      where: { id, userId },
    });
  }

  async update(
    userId: string,
    id: string,
    updateTournamentDto: UpdateTournamentDto,
  ) {
    const tournament = await this.tournamentsRepository.findUnique({
      where: { id, userId },
    });

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // return this.tournamentsRepository.update({
    //   where: { id },
    //   data: updateTournamentDto,
    // });
  }

  async remove(userId: string, id: string) {
    const tournament = await this.tournamentsRepository.findUnique({
      where: { id, userId },
    });
    const bank = await this.banksRepository.findByUserId(userId);

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Update bank to remove tournament results
    await this.banksRepository.update(bank.id, {
      bank: bank.bank - tournament.profit,
      profit: bank.profit - tournament.profit,
    });

    return this.tournamentsRepository.delete({
      where: { id },
    });
  }
}
