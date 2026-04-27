import { Injectable, NotFoundException } from '@nestjs/common';
import { ScheduleType } from '@prisma/client';
import { TournamentSchedulesRepository } from 'src/database/repositories/tournament-schedules.repository';
import { CreateTournamentScheduleDto } from './dto/create-tournament-schedule.dto';
import { UpdateTournamentScheduleDto } from './dto/update-tournament-schedule.dto';

@Injectable()
export class TournamentSchedulesService {
  constructor(
    private readonly tournamentSchedulesRepository: TournamentSchedulesRepository,
  ) {}

  create(userId: string, dto: CreateTournamentScheduleDto) {
    return this.tournamentSchedulesRepository.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
      },
    });
  }

  findAll(userId: string, type?: ScheduleType) {
    return this.tournamentSchedulesRepository.findMany({
      where: { userId, ...(type && { type }) },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async update(userId: string, id: string, dto: UpdateTournamentScheduleDto) {
    const existing = await this.tournamentSchedulesRepository.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Schedule not found');
    }

    return this.tournamentSchedulesRepository.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
      },
    });
  }

  async remove(userId: string, id: string) {
    const existing = await this.tournamentSchedulesRepository.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Schedule not found');
    }

    return this.tournamentSchedulesRepository.delete({ where: { id } });
  }
}
