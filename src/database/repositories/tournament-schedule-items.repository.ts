import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TournamentScheduleItemsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(createDto: Prisma.TournamentScheduleItemCreateArgs) {
    return this.prismaService.tournamentScheduleItem.create(createDto);
  }

  findMany(findManyDto: Prisma.TournamentScheduleItemFindManyArgs) {
    return this.prismaService.tournamentScheduleItem.findMany(findManyDto);
  }

  findUnique(findUniqueDto: Prisma.TournamentScheduleItemFindUniqueArgs) {
    return this.prismaService.tournamentScheduleItem.findUnique(findUniqueDto);
  }

  update(updateDto: Prisma.TournamentScheduleItemUpdateArgs) {
    return this.prismaService.tournamentScheduleItem.update(updateDto);
  }

  delete(deleteDto: Prisma.TournamentScheduleItemDeleteArgs) {
    return this.prismaService.tournamentScheduleItem.delete(deleteDto);
  }
}

