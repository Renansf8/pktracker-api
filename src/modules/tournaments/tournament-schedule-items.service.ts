import { Injectable } from '@nestjs/common';
import { TournamentScheduleItemsRepository } from 'src/database/repositories/tournament-schedule-items.repository';
import { CreateTournamentScheduleItemDto } from './dto/create-tournament-schedule-item.dto';
import { UpdateTournamentScheduleItemDto } from './dto/update-tournament-schedule-item.dto';

@Injectable()
export class TournamentScheduleItemsService {
  constructor(
    private readonly tournamentScheduleItemsRepository: TournamentScheduleItemsRepository,
  ) {}

  create(userId: string, dto: CreateTournamentScheduleItemDto) {
    return this.tournamentScheduleItemsRepository.create({
      data: {
        userId,
        name: dto.name,
        platform: dto.platform,
        buyIn: dto.buyIn,
        currency: dto.currency,
        time: dto.time,
      },
    });
  }

  findAll(userId: string) {
    return this.tournamentScheduleItemsRepository.findMany({
      where: { userId },
      orderBy: [{ time: 'asc' }, { name: 'asc' }],
    });
  }

  async update(userId: string, id: string, dto: UpdateTournamentScheduleItemDto) {
    const existing = await this.tournamentScheduleItemsRepository.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      throw new Error('Schedule item not found');
    }

    return this.tournamentScheduleItemsRepository.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.platform !== undefined && { platform: dto.platform }),
        ...(dto.buyIn !== undefined && { buyIn: dto.buyIn }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.time !== undefined && { time: dto.time }),
      },
    });
  }

  async remove(userId: string, id: string) {
    const existing = await this.tournamentScheduleItemsRepository.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      throw new Error('Schedule item not found');
    }

    return this.tournamentScheduleItemsRepository.delete({
      where: { id },
    });
  }
}

