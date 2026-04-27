import { Injectable, NotFoundException } from '@nestjs/common';
import { TournamentScheduleItemsRepository } from 'src/database/repositories/tournament-schedule-items.repository';
import { TournamentSchedulesRepository } from 'src/database/repositories/tournament-schedules.repository';
import { CreateTournamentScheduleItemDto } from './dto/create-tournament-schedule-item.dto';
import { UpdateTournamentScheduleItemDto } from './dto/update-tournament-schedule-item.dto';

@Injectable()
export class TournamentScheduleItemsService {
  constructor(
    private readonly tournamentScheduleItemsRepository: TournamentScheduleItemsRepository,
    private readonly tournamentSchedulesRepository: TournamentSchedulesRepository,
  ) {}

  async create(
    userId: string,
    scheduleId: string,
    dto: CreateTournamentScheduleItemDto,
  ) {
    const schedule = await this.tournamentSchedulesRepository.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule || schedule.userId !== userId) {
      throw new NotFoundException('Schedule not found');
    }

    return this.tournamentScheduleItemsRepository.create({
      data: {
        userId,
        scheduleId,
        name: dto.name,
        platform: dto.platform,
        buyIn: dto.buyIn,
        currency: dto.currency,
        time: dto.time,
      },
    });
  }

  findAll(userId: string, scheduleId: string) {
    return this.tournamentScheduleItemsRepository.findMany({
      where: { userId, scheduleId },
      orderBy: [{ time: 'asc' }, { name: 'asc' }],
    });
  }

  async update(
    userId: string,
    scheduleId: string,
    id: string,
    dto: UpdateTournamentScheduleItemDto,
  ) {
    const existing = await this.tournamentScheduleItemsRepository.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId || existing.scheduleId !== scheduleId) {
      throw new NotFoundException('Schedule item not found');
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

  async remove(userId: string, scheduleId: string, id: string) {
    const existing = await this.tournamentScheduleItemsRepository.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId || existing.scheduleId !== scheduleId) {
      throw new NotFoundException('Schedule item not found');
    }

    return this.tournamentScheduleItemsRepository.delete({ where: { id } });
  }
}
