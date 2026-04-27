import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TournamentSchedulesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(createDto: Prisma.TournamentScheduleCreateArgs) {
    return this.prismaService.tournamentSchedule.create(createDto);
  }

  findMany(findManyDto: Prisma.TournamentScheduleFindManyArgs) {
    return this.prismaService.tournamentSchedule.findMany(findManyDto);
  }

  findUnique(findUniqueDto: Prisma.TournamentScheduleFindUniqueArgs) {
    return this.prismaService.tournamentSchedule.findUnique(findUniqueDto);
  }

  update(updateDto: Prisma.TournamentScheduleUpdateArgs) {
    return this.prismaService.tournamentSchedule.update(updateDto);
  }

  delete(deleteDto: Prisma.TournamentScheduleDeleteArgs) {
    return this.prismaService.tournamentSchedule.delete(deleteDto);
  }
}
