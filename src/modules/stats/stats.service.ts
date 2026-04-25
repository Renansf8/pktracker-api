import { Injectable } from '@nestjs/common';
import { StatsRepository } from '../../database/repositories/stats.repository';
import type {
  BiggestBuyIn,
  ProfitRecords,
  StatsSummary,
  TimeBucket,
} from './entities/stats-summary.entity';

@Injectable()
export class StatsService {
  private readonly buckets: TimeBucket[] = ['day', 'week', 'month', 'year'];

  constructor(private readonly statsRepository: StatsRepository) {}

  async getSummary(userId: string): Promise<StatsSummary> {
    const [
      biggestBuyInTournament,
      profitDayRecord,
      profitWeekRecord,
      profitMonthRecord,
      profitYearRecord,
      lossDayRecord,
      lossWeekRecord,
      lossMonthRecord,
      lossYearRecord,
      mostTournamentsInADay,
      highestAbiDay,
    ] = await Promise.all([
      this.statsRepository.findBiggestBuyInTournament(userId),
      this.statsRepository.findProfitBucketRecord(userId, 'day', 'highest'),
      this.statsRepository.findProfitBucketRecord(userId, 'week', 'highest'),
      this.statsRepository.findProfitBucketRecord(userId, 'month', 'highest'),
      this.statsRepository.findProfitBucketRecord(userId, 'year', 'highest'),
      this.statsRepository.findProfitBucketRecord(userId, 'day', 'lowest'),
      this.statsRepository.findProfitBucketRecord(userId, 'week', 'lowest'),
      this.statsRepository.findProfitBucketRecord(userId, 'month', 'lowest'),
      this.statsRepository.findProfitBucketRecord(userId, 'year', 'lowest'),
      this.statsRepository.findMostTournamentsInADay(userId),
      this.statsRepository.findHighestAbiDay(userId),
    ]);

    const biggestBuyIn: BiggestBuyIn | null =
      biggestBuyInTournament && biggestBuyInTournament.buyIn !== 'ticket'
        ? {
            value: parseFloat(biggestBuyInTournament.buyIn),
            tournament: {
              id: biggestBuyInTournament.id,
              name: biggestBuyInTournament.name,
              platform: biggestBuyInTournament.platform,
              date: biggestBuyInTournament.date,
            },
          }
        : null;

    const profitRecords: ProfitRecords = {
      day: profitDayRecord,
      week: profitWeekRecord,
      month: profitMonthRecord,
      year: profitYearRecord,
    };

    const lossRecords: ProfitRecords = {
      day: lossDayRecord,
      week: lossWeekRecord,
      month: lossMonthRecord,
      year: lossYearRecord,
    };

    return {
      biggestBuyIn,
      profitRecords,
      lossRecords,
      mostTournamentsInADay,
      highestAbiDay,
    };
  }
}
