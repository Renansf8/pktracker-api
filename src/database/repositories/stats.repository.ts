import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { TimeBucket } from '../../modules/stats/entities/stats-summary.entity';

type ProfitDirection = 'highest' | 'lowest';

interface ProfitAggregateRow {
  bucket: Date;
  total: string | number;
}

interface CountAggregateRow {
  day: Date;
  total: string | number;
}

interface AbiAggregateRow {
  day: Date;
  abi: string | number;
  total: string | number;
}

@Injectable()
export class StatsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Returns the tournament with the largest buy-in for a given user, or null
   * if the user has no tournaments yet.
   */
  async findBiggestBuyInTournament(
    userId: string,
  ): Promise<{ id: string; name: string; platform: string; date: Date; buyIn: string } | null> {
    const rows = await this.prismaService.$queryRawUnsafe<
      { id: string; name: string; platform: string; date: Date; buyIn: string }[]
    >(
      `
        SELECT id, name, platform, date, "buyIn"
        FROM tournaments
        WHERE user_id = $1::uuid
          AND "buyIn" != 'ticket'
        ORDER BY CAST("buyIn" AS FLOAT) DESC, date DESC
        LIMIT 1
      `,
      userId,
    );

    return rows.length ? rows[0] : null;
  }

  /**
   * Aggregates tournaments into time buckets (day/week/month/year) summing
   * profit, then returns the bucket with either the highest (most profit) or
   * lowest (biggest loss) sum.
   *
   * Postgres `date_trunc('week', ...)` defaults to ISO weeks starting on
   * Monday, which matches the requirement.
   *
   * The `unit` parameter is interpolated directly into the SQL because
   * `date_trunc` requires a literal field identifier; we therefore validate it
   * against an allowlist before composing the query.
   */
  async findProfitBucketRecord(
    userId: string,
    unit: TimeBucket,
    direction: ProfitDirection,
  ): Promise<{ bucketStart: Date; amount: number } | null> {
    const allowedUnits: TimeBucket[] = ['day', 'week', 'month', 'year'];
    if (!allowedUnits.includes(unit)) {
      throw new Error(`Invalid time bucket unit: ${unit}`);
    }

    const order = direction === 'highest' ? 'DESC' : 'ASC';
    const havingClause =
      direction === 'highest' ? 'HAVING SUM(profit) > 0' : 'HAVING SUM(profit) < 0';

    const sql = `
      SELECT date_trunc('${unit}', date) AS bucket,
             SUM(profit)                  AS total
      FROM tournaments
      WHERE user_id = $1::uuid
      GROUP BY bucket
      ${havingClause}
      ORDER BY total ${order}
      LIMIT 1
    `;

    const rows = await this.prismaService.$queryRawUnsafe<ProfitAggregateRow[]>(
      sql,
      userId,
    );

    if (!rows.length) return null;

    return {
      bucketStart: rows[0].bucket,
      amount: Number(rows[0].total),
    };
  }

  /**
   * Returns the day with the most tournaments played by the user, including
   * tournaments that don't have a result yet (per product decision).
   */
  async findMostTournamentsInADay(
    userId: string,
  ): Promise<{ date: Date; count: number } | null> {
    const rows = await this.prismaService.$queryRawUnsafe<CountAggregateRow[]>(
      `
        SELECT date_trunc('day', date) AS day,
               COUNT(*)                AS total
        FROM tournaments
        WHERE user_id = $1::uuid
        GROUP BY day
        ORDER BY total DESC, day DESC
        LIMIT 1
      `,
      userId,
    );

    if (!rows.length) return null;

    return {
      date: rows[0].day,
      count: Number(rows[0].total),
    };
  }

  /**
   * Returns the day with the highest Average Buy-In (ABI). Days with a single
   * tournament are eligible, per product decision.
   */
  async findHighestAbiDay(
    userId: string,
  ): Promise<{ date: Date; abi: number; tournaments: number } | null> {
    const rows = await this.prismaService.$queryRawUnsafe<AbiAggregateRow[]>(
      `
        SELECT date_trunc('day', date)       AS day,
               AVG(CAST("buyIn" AS FLOAT))   AS abi,
               COUNT(*)                       AS total
        FROM tournaments
        WHERE user_id = $1::uuid
          AND "buyIn" != 'ticket'
        GROUP BY day
        ORDER BY abi DESC, day DESC
        LIMIT 1
      `,
      userId,
    );

    if (!rows.length) return null;

    return {
      date: rows[0].day,
      abi: Number(rows[0].abi),
      tournaments: Number(rows[0].total),
    };
  }
}
