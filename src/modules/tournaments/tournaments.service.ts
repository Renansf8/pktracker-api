import { Injectable } from '@nestjs/common';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { FilterTournamentsDto } from './dto/filter-tournaments.dto';
import { TournamentsRepository } from 'src/database/repositories/tournaments.repository';
import { BanksRepository } from 'src/database/repositories/banks.repositories';
import { TournamentScheduleItemsRepository } from 'src/database/repositories/tournament-schedule-items.repository';

@Injectable()
export class TournamentsService {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly banksRepository: BanksRepository,
    private readonly tournamentScheduleItemsRepository: TournamentScheduleItemsRepository,
  ) {}

  async create(userId: string, createTournamentDto: CreateTournamentDto) {
    const bank = await this.banksRepository.findByUserId(userId);

    if (!bank) {
      throw new Error('Bank not found for this user');
    }

    const buyInIsTicket = createTournamentDto.buyIn === 'ticket';
    const resultIsTicket = createTournamentDto.result === 'ticket';
    const hasNumericResult =
      createTournamentDto.result !== undefined && !resultIsTicket;

    const profit = buyInIsTicket
      ? hasNumericResult ? (createTournamentDto.result as number) : 0 // paid with ticket: profit = result, or 0 if no result
      : resultIsTicket
        ? -(createTournamentDto.buyIn as number) // spent buyIn, got a ticket back
        : hasNumericResult
          ? (createTournamentDto.result as number) - (createTournamentDto.buyIn as number)
          : 0;

    const tournament = await this.tournamentsRepository.create({
      name: createTournamentDto.name,
      platform: createTournamentDto.platform,
      buyIn: createTournamentDto.buyIn.toString(),
      currency: createTournamentDto.currency,
      result: createTournamentDto.result !== undefined ? createTournamentDto.result.toString() : null,
      profit,
      itm: createTournamentDto.itm,
      position: createTournamentDto.itm ? (createTournamentDto.position ?? null) : null,
      date: new Date(createTournamentDto.date),
      user: {
        connect: { id: userId },
      },
      bank: {
        connect: { id: bank.id },
      },
    });

    if (tournament.profit !== 0) {
      await this.banksRepository.update(bank.id, {
        bank: bank.bank + tournament.profit,
        profit: bank.profit + tournament.profit,
      });
    }

    return tournament;
  }

  async createBulk(userId: string, tournaments: CreateTournamentDto[]) {
    const bank = await this.banksRepository.findByUserId(userId);

    if (!bank) {
      throw new Error('Bank not found for this user');
    }

    const created: any[] = [];
    let profitSum = 0;

    for (const dto of tournaments) {
      const buyInIsTicket = dto.buyIn === 'ticket';
      const resultIsTicket = dto.result === 'ticket';
      const hasNumericResult = dto.result !== undefined && !resultIsTicket;

      const profit = buyInIsTicket
        ? hasNumericResult ? (dto.result as number) : 0
        : resultIsTicket
          ? -(dto.buyIn as number)
          : hasNumericResult
            ? (dto.result as number) - (dto.buyIn as number)
            : 0;
      profitSum += profit;

      const tournament = await this.tournamentsRepository.create({
        name: dto.name,
        platform: dto.platform,
        buyIn: dto.buyIn.toString(),
        currency: dto.currency,
        result: dto.result !== undefined ? dto.result.toString() : null,
        profit,
        itm: dto.itm,
        position: dto.itm ? (dto.position ?? null) : null,
        date: new Date(dto.date),
        user: { connect: { id: userId } },
        bank: { connect: { id: bank.id } },
      });

      created.push(tournament);
    }

    if (profitSum !== 0) {
      await this.banksRepository.update(bank.id, {
        bank: bank.bank + profitSum,
        profit: bank.profit + profitSum,
      });
    }

    return created;
  }

  async applySchedule(userId: string, options?: { ids?: string[] }) {
    const bank = await this.banksRepository.findByUserId(userId);

    if (!bank) {
      throw new Error('Bank not found for this user');
    }

    const scheduleItems = await this.tournamentScheduleItemsRepository.findMany({
      where: {
        userId,
        ...(options?.ids?.length ? { id: { in: options.ids } } : {}),
      },
      orderBy: [{ time: 'asc' }, { name: 'asc' }],
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    const created: any[] = [];

    for (const item of scheduleItems) {
      const [hh, mm] = item.time.split(':').map((v) => Number(v));
      const date = new Date(year, month, day, hh || 0, mm || 0, 0, 0);

      const tournament = await this.tournamentsRepository.create({
        name: item.name,
        platform: item.platform,
        buyIn: item.buyIn.toString(),
        currency: item.currency,
        result: null,
        profit: 0,
        date,
        user: { connect: { id: userId } },
        bank: { connect: { id: bank.id } },
      });

      created.push(tournament);
    }

    return created;
  }

  async findAll(userId: string, filters?: FilterTournamentsDto) {
    const page = Math.max(1, Number(filters?.page) || 1);
    const limit = Math.max(1, Number(filters?.limit) || 20);
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(filters?.platform && { platform: filters.platform }),
    };

    const skipValue = Number.isNaN(skip) || skip < 0 ? 0 : skip;
    const takeValue = Number.isNaN(limit) || limit <= 0 ? 10 : limit;
    
    const queryParams: any = {
      where,
      orderBy: { date: 'desc' },
    };

    if (skipValue > 0) {
      queryParams.skip = skipValue;
    }
    
    if (takeValue > 0) {
      queryParams.take = takeValue;
    }


    const [data, total] = await Promise.all([
      this.tournamentsRepository.findMany(queryParams),
      this.tournamentsRepository.count({ where }),
    ]);


    const totalPages = Math.ceil(total / limit);

    return {
      data,
      totalPages,
      total
    };
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

    const bank = await this.banksRepository.findByUserId(userId);

    if (!bank) {
      throw new Error('Bank not found for this user');
    }

    const currentProfit = tournament.profit ?? 0;

    // Resolve effective buyIn after update
    const nextBuyIn: number | 'ticket' =
      updateTournamentDto.buyIn !== undefined
        ? updateTournamentDto.buyIn
        : tournament.buyIn === 'ticket'
          ? 'ticket'
          : parseFloat(tournament.buyIn);

    // Resolve effective result after update
    const nextResult: number | 'ticket' | undefined =
      updateTournamentDto.result !== undefined
        ? updateTournamentDto.result
        : tournament.result === 'ticket'
          ? 'ticket'
          : tournament.result !== null && tournament.result !== undefined
            ? parseFloat(tournament.result)
            : undefined;

    const nextBuyInIsTicket = nextBuyIn === 'ticket';
    const nextResultIsTicket = nextResult === 'ticket';

    const nextProfit = nextBuyInIsTicket
      ? nextResult !== undefined && !nextResultIsTicket ? (nextResult as number) : 0
      : nextResultIsTicket
        ? -(nextBuyIn as number)
        : nextResult === undefined
          ? currentProfit
          : (nextResult as number) - (nextBuyIn as number);
    const profitDelta = nextProfit - currentProfit;

    const updatedTournament = await this.tournamentsRepository.update({
      where: { id },
      data: {
        ...(updateTournamentDto.name !== undefined && {
          name: updateTournamentDto.name,
        }),
        ...(updateTournamentDto.platform !== undefined && {
          platform: updateTournamentDto.platform,
        }),
        ...(updateTournamentDto.currency !== undefined && {
          currency: updateTournamentDto.currency,
        }),
        ...(updateTournamentDto.buyIn !== undefined && {
          buyIn: nextBuyIn.toString(),
        }),
        ...(updateTournamentDto.result !== undefined && {
          result: nextResult !== undefined ? nextResult.toString() : null,
        }),
        ...(updateTournamentDto.date !== undefined && {
          date: new Date(updateTournamentDto.date),
        }),
        ...(updateTournamentDto.itm !== undefined && {
          itm: updateTournamentDto.itm,
          position: updateTournamentDto.itm ? (updateTournamentDto.position ?? null) : null,
        }),
        ...(updateTournamentDto.hasFt !== undefined && {
          hasFt: updateTournamentDto.hasFt,
        }),
        ...(updateTournamentDto.buyIn !== undefined ||
        updateTournamentDto.result !== undefined
          ? { profit: nextProfit }
          : {}),
      },
    });

    if (profitDelta !== 0) {
      await this.banksRepository.update(bank.id, {
        bank: bank.bank + profitDelta,
        profit: bank.profit + profitDelta,
      });
    }

    return updatedTournament;
  }

  async remove(userId: string, id: string) {
    const tournament = await this.tournamentsRepository.findUnique({
      where: { id, userId },
    });
    const bank = await this.banksRepository.findByUserId(userId);

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.profit !== 0) {
      await this.banksRepository.update(bank.id, {
        bank: bank.bank - tournament.profit,
        profit: bank.profit - tournament.profit,
      });
    }

    return this.tournamentsRepository.delete({
      where: { id },
    });
  }
}
