import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { type Prisma } from '@prisma/client';

@Injectable()
export class TournamentsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(createDto: Prisma.TournamentCreateInput) {
    return this.prismaService.tournament.create({
      data: createDto,
    });
  }

  findMany(findManyDto: Prisma.TournamentFindManyArgs) {
    return this.prismaService.tournament.findMany(findManyDto);
  }

  count(countDto: Prisma.TournamentCountArgs) {
    return this.prismaService.tournament.count(countDto);
  }

  findUnique(findUniqueDto: Prisma.TournamentFindUniqueArgs) {
    return this.prismaService.tournament.findUnique(findUniqueDto);
  }

  update(updateDto: Prisma.TournamentUpdateArgs) {
    return this.prismaService.tournament.update(updateDto);
  }

  delete(deleteDto: Prisma.TournamentDeleteArgs) {
    return this.prismaService.tournament.delete(deleteDto);
  }

  aggregate(aggregateDto: Prisma.TournamentAggregateArgs) {
    return this.prismaService.tournament.aggregate(aggregateDto);
  }
}
