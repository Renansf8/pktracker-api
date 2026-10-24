import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export type InsightsGroupBy = 'platform' | 'currency' | 'tournament_name';
export type InsightsBucket = 'day' | 'week' | 'month';

export interface InsightsFilter {
  /** Inclusive start. */
  from: Date;
  /** Exclusive end. */
  to: Date;
  /** Exact platform name; null for every platform. */
  platform: string | null;
}

export interface TournamentEntry {
  platform: string;
  currency: string;
  /** null when the entries were paid with a ticket. */
  buyIn: number | null;
}

export interface AggregateRow {
  key: string | null;
  /** Set only when grouping by tournament name. */
  entry: TournamentEntry | null;
  tournaments: number;
  buyInTotal: number;
  buyInCount: number;
  profitTotal: number;
  itmCount: number;
}

export interface BucketRow {
  bucket: Date;
  tournaments: number;
  profitTotal: number;
}

export interface UserTournamentContext {
  totalTournaments: number;
  firstTournamentDate: Date | null;
  lastTournamentDate: Date | null;
  platforms: string[];
  currencies: string[];
}

interface RawAggregateRow {
  key: string | null;
  entry_platform: string | null;
  entry_currency: string | null;
  entry_buy_in: number | null;
  tournaments: string | number;
  buy_in_total: string | number;
  buy_in_count: string | number;
  profit_total: string | number;
  itm_count: string | number;
}

interface RawBucketRow {
  bucket: Date;
  tournaments: string | number;
  profit_total: string | number;
}

/**
 * Aggregate queries backing the generative dashboards. Every query is scoped
 * to a single user. Column/unit identifiers that can't be bound as
 * parameters are checked against allowlists before being interpolated.
 */
@Injectable()
export class InsightsRepository {
  /** Buy-in as a number; NULL for ticket entries. */
  private static readonly BUY_IN_KEY = `CASE WHEN "buyIn" = 'ticket' THEN NULL ELSE CAST("buyIn" AS FLOAT) END`;

  /**
   * `group` decides which rows fall together; `label` is what's shown.
   *
   * A tournament is a name on a platform at a buy-in: the same name on two
   * sites, or at $10 and $50, are different tournaments. Names are typed by
   * hand, so they're matched ignoring case and extra spaces ("Bounty Hunters"
   * = "bounty  hunters") and labelled with the spelling the player used most.
   */
  private static readonly GROUPS: Record<
    InsightsGroupBy,
    { group: string; label: string; entry: [string, string, string] }
  > = {
    platform: {
      group: 'platform',
      label: 'platform',
      entry: ['NULL', 'NULL', 'NULL'],
    },
    currency: {
      group: 'currency',
      label: 'currency',
      entry: ['NULL', 'NULL', 'NULL'],
    },
    tournament_name: {
      group: `lower(regexp_replace(btrim(name), '\\s+', ' ', 'g')), platform, currency, ${InsightsRepository.BUY_IN_KEY}`,
      label: `MODE() WITHIN GROUP (ORDER BY btrim(name))`,
      entry: ['platform', 'currency', InsightsRepository.BUY_IN_KEY],
    },
  };

  private static readonly BUCKETS: InsightsBucket[] = ['day', 'week', 'month'];

  constructor(private readonly prismaService: PrismaService) {}

  async getUserContext(userId: string): Promise<UserTournamentContext> {
    const rows = await this.prismaService.$queryRawUnsafe<
      {
        total: string | number;
        first_date: Date | null;
        last_date: Date | null;
        platforms: string[] | null;
        currencies: string[] | null;
      }[]
    >(
      `
        SELECT COUNT(*)                         AS total,
               MIN(date)                        AS first_date,
               MAX(date)                        AS last_date,
               ARRAY_AGG(DISTINCT platform)     AS platforms,
               ARRAY_AGG(DISTINCT currency)     AS currencies
        FROM tournaments
        WHERE user_id = $1::uuid
      `,
      userId,
    );

    const row = rows[0];
    const total = Number(row?.total ?? 0);

    return {
      totalTournaments: total,
      firstTournamentDate: row?.first_date ?? null,
      lastTournamentDate: row?.last_date ?? null,
      platforms: total ? (row.platforms ?? []) : [],
      currencies: total ? (row.currencies ?? []) : [],
    };
  }

  /**
   * Sums buy-ins, profit and ITMs in a date range. Without `groupBy` it
   * returns a single row with the totals. Ticket buy-ins count as
   * tournaments but not towards the buy-in sum.
   */
  async aggregate(
    userId: string,
    filter: InsightsFilter,
    groupBy?: InsightsGroupBy,
  ): Promise<AggregateRow[]> {
    let keyExpr = 'NULL';
    let entryExprs = ['NULL', 'NULL', 'NULL'];
    let groupClause = '';
    if (groupBy) {
      const grouping = InsightsRepository.GROUPS[groupBy];
      if (!grouping) throw new Error(`Invalid groupBy: ${groupBy}`);
      keyExpr = grouping.label;
      entryExprs = grouping.entry;
      groupClause = `GROUP BY ${grouping.group} ORDER BY 1, 2, 4`;
    }
    const [platformExpr, currencyExpr, buyInExpr] = entryExprs;

    const rows = await this.prismaService.$queryRawUnsafe<RawAggregateRow[]>(
      `
        SELECT ${keyExpr}                                             AS key,
               ${platformExpr}                                        AS entry_platform,
               ${currencyExpr}                                        AS entry_currency,
               ${buyInExpr}                                           AS entry_buy_in,
               COUNT(*)                                               AS tournaments,
               COALESCE(SUM(CASE WHEN "buyIn" != 'ticket'
                                 THEN CAST("buyIn" AS FLOAT) END), 0) AS buy_in_total,
               COUNT(*) FILTER (WHERE "buyIn" != 'ticket')            AS buy_in_count,
               COALESCE(SUM(profit), 0)                               AS profit_total,
               COUNT(*) FILTER (WHERE itm)                            AS itm_count
        FROM tournaments
        WHERE user_id = $1::uuid
          AND date >= $2
          AND date < $3
          AND ($4::text IS NULL OR platform = $4::text)
        ${groupClause}
      `,
      userId,
      filter.from,
      filter.to,
      filter.platform,
    );

    return rows.map((row) => ({
      key: row.key,
      entry: row.entry_platform
        ? {
            platform: row.entry_platform,
            currency: row.entry_currency,
            buyIn: row.entry_buy_in === null ? null : Number(row.entry_buy_in),
          }
        : null,
      tournaments: Number(row.tournaments),
      buyInTotal: Number(row.buy_in_total),
      buyInCount: Number(row.buy_in_count),
      profitTotal: Number(row.profit_total),
      itmCount: Number(row.itm_count),
    }));
  }

  /** Profit and tournament count per time bucket, oldest first. */
  async aggregateByBucket(
    userId: string,
    filter: InsightsFilter,
    bucket: InsightsBucket,
  ): Promise<BucketRow[]> {
    if (!InsightsRepository.BUCKETS.includes(bucket)) {
      throw new Error(`Invalid time bucket: ${bucket}`);
    }

    const rows = await this.prismaService.$queryRawUnsafe<RawBucketRow[]>(
      `
        SELECT date_trunc('${bucket}', date) AS bucket,
               COUNT(*)                      AS tournaments,
               COALESCE(SUM(profit), 0)      AS profit_total
        FROM tournaments
        WHERE user_id = $1::uuid
          AND date >= $2
          AND date < $3
          AND ($4::text IS NULL OR platform = $4::text)
        GROUP BY bucket
        ORDER BY bucket
      `,
      userId,
      filter.from,
      filter.to,
      filter.platform,
    );

    return rows.map((row) => ({
      bucket: row.bucket,
      tournaments: Number(row.tournaments),
      profitTotal: Number(row.profit_total),
    }));
  }
}
