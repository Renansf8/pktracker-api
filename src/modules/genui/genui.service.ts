import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../shared/config/env';
import {
  AggregateRow,
  InsightsFilter,
  InsightsRepository,
  UserTournamentContext,
} from '../../database/repositories/insights.repository';
import {
  BucketType,
  DASHBOARD_JSON_SCHEMA,
  DashboardSpec,
  DashboardSpecType,
  PeriodSpec,
  TableSortByType,
  WidgetSpec,
} from './genui.schema';
import { GENUI_SYSTEM_PROMPT } from './genui.prompt';
import { callClaude, replyText } from './genui.model';
import { GenUiQuota } from './genui.quota';
import { barLabel, safeCurrencies, safePlatforms } from './genui.format';
import type {
  GeneratedDashboard,
  GroupStatsRow,
  ValueUnit,
  WidgetData,
} from './entities/dashboard.entity';

export const ANTHROPIC_CLIENT = Symbol('ANTHROPIC_CLIENT');

const MAX_WIDGETS = 6;
const MAX_TITLE_LENGTH = 80;
/** Above this many points a line chart moves to a coarser bucket. */
const MAX_LINE_POINTS = 120;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Rows/bars when the model doesn't set a limit, and the hard cap. */
const DEFAULT_LIMIT = {
  bar_chart: 15,
  table: 50,
  tournament_list: 10,
} as const;
const MAX_LIMIT = 100;
const TABLE_SORT_FIELDS: Record<TableSortByType, keyof GroupStatsRow> = {
  profit: 'profit',
  roi: 'roi',
  tournaments: 'tournaments',
  buy_ins: 'buyIns',
  itm_rate: 'itmRate',
  ft_rate: 'ftRate',
  abi: 'abi',
};
const BUCKET_DAYS: Record<BucketType, number> = { day: 1, week: 7, month: 30 };
const NEXT_BUCKET: Record<BucketType, BucketType> = {
  day: 'week',
  week: 'month',
  month: 'month',
};

const UNITS: Record<string, ValueUnit> = {
  total_profit: 'money',
  profit: 'money',
  cumulative_profit: 'money',
  abi: 'money',
  avg_profit: 'money',
  biggest_cash: 'money',
  total_invested: 'money',
  roi: 'percent',
  itm_rate: 'percent',
  ft_rate: 'percent',
  day2_rate: 'percent',
  tournament_count: 'count',
  wins: 'count',
  podiums: 'count',
};

@Injectable()
export class GenUiService {
  private readonly logger = new Logger(GenUiService.name);

  constructor(
    @Inject(ANTHROPIC_CLIENT) private readonly client: Anthropic | null,
    private readonly insightsRepository: InsightsRepository,
    private readonly quota: GenUiQuota,
  ) {}

  async generateDashboard(
    userId: string,
    prompt: string,
  ): Promise<GeneratedDashboard> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Geração de dashboards não está configurada no servidor.',
      );
    }
    this.quota.consume(userId, 'dashboard');

    const context = await this.insightsRepository.getUserContext(userId);
    const rawSpec = await this.requestSpec(userId, prompt, context);
    return this.resolveDashboard(userId, rawSpec, context);
  }

  /**
   * Normalizes a spec against the user's data and runs the SQL for each
   * widget. Always filtered by `userId`, whoever produced the spec.
   */
  async resolveDashboard(
    userId: string,
    spec: DashboardSpecType,
    context?: UserTournamentContext,
  ): Promise<GeneratedDashboard> {
    const userContext =
      context ?? (await this.insightsRepository.getUserContext(userId));
    const normalized = this.normalizeSpec(spec, userContext);
    const data = await Promise.all(
      normalized.widgets.map((widget) => this.resolveWidget(userId, widget)),
    );
    return { spec: normalized, data };
  }

  private async requestSpec(
    userId: string,
    prompt: string,
    context: UserTournamentContext,
  ): Promise<DashboardSpecType> {
    const today = toIsoDate(new Date());
    const playerContext = {
      totalTournaments: context.totalTournaments,
      firstTournamentDate: context.firstTournamentDate
        ? toIsoDate(context.firstTournamentDate)
        : null,
      lastTournamentDate: context.lastTournamentDate
        ? toIsoDate(context.lastTournamentDate)
        : null,
      platforms: safePlatforms(context.platforms),
      currencies: safeCurrencies(context.currencies),
    };

    const response = await callClaude(this.client, this.logger, {
      tag: 'genui',
      userId,
      model: env.genuiModel,
      system: GENUI_SYSTEM_PROMPT,
      schema: DASHBOARD_JSON_SCHEMA,
      content: `Today: ${today}\nPlayer context: ${JSON.stringify(playerContext)}\n\n<request>\n${prompt}\n</request>`,
      maxTokens: 8000,
      refusalMessage: 'Não consigo montar um dashboard para esse pedido.',
    });

    const spec =
      response.stop_reason === 'end_turn' ? parseSpec(response) : null;
    if (!spec) {
      this.logger.warn(
        `genui could not parse spec user=${userId} stop=${response.stop_reason}`,
      );
      throw new BadGatewayException(
        'Não consegui montar o dashboard. Tente reformular o pedido.',
      );
    }
    return spec;
  }

  /**
   * Enforces what the schema can't: widget count, title length, valid
   * periods, known platform names, row limits and a sane number of points
   * per line chart.
   */
  normalizeSpec(
    spec: DashboardSpecType,
    context: UserTournamentContext,
  ): DashboardSpecType {
    const widgets = spec.widgets.slice(0, MAX_WIDGETS).map((widget) => {
      const period = normalizePeriod(widget.period, context);
      const normalized = {
        ...widget,
        title: widget.title.trim().slice(0, MAX_TITLE_LENGTH),
        period,
        platform: normalizePlatform(widget.platform, context),
      };
      if (normalized.type === 'line_chart') {
        normalized.bucket = fitBucket(normalized.bucket, period);
      }
      if (
        normalized.type === 'bar_chart' ||
        normalized.type === 'table' ||
        normalized.type === 'tournament_list'
      ) {
        normalized.limit = clampLimit(
          normalized.limit,
          DEFAULT_LIMIT[normalized.type],
        );
      }
      return normalized;
    });

    return {
      title: spec.title.trim().slice(0, MAX_TITLE_LENGTH),
      summary: spec.summary.trim(),
      widgets,
    };
  }

  private async resolveWidget(
    userId: string,
    widget: WidgetSpec,
  ): Promise<WidgetData> {
    const filter = toFilter(widget.period, widget.platform);

    switch (widget.type) {
      case 'stat': {
        const [totals] = await this.insightsRepository.aggregate(
          userId,
          filter,
        );
        const stats = toGroupStats(totals);
        return {
          type: 'stat',
          unit: UNITS[widget.metric],
          value: pickMetric(stats, widget.metric),
          tournaments: stats.tournaments,
        };
      }
      case 'line_chart': {
        const rows = await this.insightsRepository.aggregateByBucket(
          userId,
          filter,
          widget.bucket,
        );
        let running = 0;
        const points = rows.map((row) => {
          running += row.profitTotal;
          const value =
            widget.metric === 'cumulative_profit'
              ? running
              : widget.metric === 'profit'
                ? row.profitTotal
                : row.tournaments;
          return { bucket: toIsoDate(row.bucket), value: round(value) };
        });
        return { type: 'line_chart', unit: UNITS[widget.metric], points };
      }
      case 'bar_chart': {
        const rows = await this.insightsRepository.aggregate(
          userId,
          filter,
          widget.groupBy,
        );
        const bars = sortByValue(
          rows.map((row) => {
            const stats = toGroupStats(row);
            return {
              label: barLabel(stats, widget.platform),
              value: pickMetric(stats, widget.metric),
            };
          }),
          (bar) => bar.value,
          widget.order,
        ).slice(0, widget.limit);
        return { type: 'bar_chart', unit: UNITS[widget.metric], bars };
      }
      case 'table': {
        const rows = await this.insightsRepository.aggregate(
          userId,
          filter,
          widget.groupBy,
        );
        const field = TABLE_SORT_FIELDS[widget.sortBy];
        const sorted = sortByValue(
          rows.map(toGroupStats),
          (row) => row[field] as number | null,
          widget.order,
        ).slice(0, widget.limit);
        return { type: 'table', rows: sorted };
      }
      case 'tournament_list': {
        const rows = await this.insightsRepository.listTournaments(
          userId,
          filter,
          widget.sortBy,
          widget.order,
          widget.limit,
        );
        return {
          type: 'tournament_list',
          rows: rows.map((row) => ({
            ...row,
            date: toIsoDate(row.date),
            profit: round(row.profit),
          })),
        };
      }
    }
  }
}

function parseSpec(response: Anthropic.Message): DashboardSpecType | null {
  try {
    const result = DashboardSpec.safeParse(JSON.parse(replyText(response)));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || toIsoDate(date) !== value
    ? null
    : date;
}

function normalizePeriod(
  period: PeriodSpec,
  context: UserTournamentContext,
): PeriodSpec {
  const today = toIsoDate(new Date());
  const fallbackFrom = context.firstTournamentDate
    ? toIsoDate(context.firstTournamentDate)
    : today;

  let from = parseIsoDate(period.from) ? period.from : fallbackFrom;
  let to = parseIsoDate(period.to) ? period.to : today;
  if (from > to) [from, to] = [to, from];
  return { from, to };
}

function fitBucket(bucket: BucketType, period: PeriodSpec): BucketType {
  const days =
    (parseIsoDate(period.to).getTime() - parseIsoDate(period.from).getTime()) /
      DAY_MS +
    1;
  let fitted = bucket;
  while (fitted !== 'month' && days / BUCKET_DAYS[fitted] > MAX_LINE_POINTS) {
    fitted = NEXT_BUCKET[fitted];
  }
  return fitted;
}

/** Maps the model's platform to the stored spelling ("gg" → "GG"). */
function normalizePlatform(
  platform: string | null,
  context: UserTournamentContext,
): string | null {
  const wanted = platform?.trim();
  if (!wanted) return null;
  const key = (value: string) => value.toLowerCase().replace(/\s+/g, '');
  return context.platforms.find((p) => key(p) === key(wanted)) ?? wanted;
}

function clampLimit(limit: number | null, fallback: number): number {
  if (limit === null || !Number.isFinite(limit)) return fallback;
  return Math.min(MAX_LIMIT, Math.max(1, Math.round(limit)));
}

/** Sorts by a numeric value; rows without a value always go last. */
function sortByValue<T>(
  rows: T[],
  getValue: (row: T) => number | null,
  order: 'asc' | 'desc',
): T[] {
  const direction = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = getValue(a);
    const vb = getValue(b);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    return (va - vb) * direction;
  });
}

/** Inclusive YYYY-MM-DD period → [from, to + 1 day), plus the platform. */
function toFilter(period: PeriodSpec, platform: string | null): InsightsFilter {
  const from = parseIsoDate(period.from);
  const to = new Date(parseIsoDate(period.to).getTime() + DAY_MS);
  return { from, to, platform };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toGroupStats(row: AggregateRow | undefined): GroupStatsRow {
  if (!row || row.tournaments === 0) {
    return {
      label: row?.key ?? 'Total',
      entry: row?.entry ?? null,
      tournaments: 0,
      buyIns: 0,
      profit: 0,
      roi: null,
      itmRate: null,
      ftRate: null,
      day2Rate: null,
      wins: 0,
      podiums: 0,
      abi: null,
      avgProfit: null,
      biggestCash: null,
    };
  }
  const rate = (count: number) => round((count / row.tournaments) * 100);
  return {
    label: row.key ?? 'Total',
    entry: row.entry ?? null,
    tournaments: row.tournaments,
    buyIns: round(row.buyInTotal),
    profit: round(row.profitTotal),
    roi:
      row.buyInTotal > 0
        ? round((row.profitTotal / row.buyInTotal) * 100)
        : null,
    itmRate: rate(row.itmCount),
    ftRate: rate(row.ftCount),
    day2Rate: rate(row.day2Count),
    wins: row.winCount,
    podiums: row.podiumCount,
    abi: row.buyInCount > 0 ? round(row.buyInTotal / row.buyInCount) : null,
    avgProfit: round(row.profitTotal / row.tournaments),
    biggestCash: row.biggestCash === null ? null : round(row.biggestCash),
  };
}

function pickMetric(stats: GroupStatsRow, metric: string): number | null {
  switch (metric) {
    case 'total_profit':
    case 'profit':
      return stats.profit;
    case 'roi':
      return stats.roi;
    case 'itm_rate':
      return stats.itmRate;
    case 'ft_rate':
      return stats.ftRate;
    case 'day2_rate':
      return stats.day2Rate;
    case 'tournament_count':
      return stats.tournaments;
    case 'wins':
      return stats.wins;
    case 'podiums':
      return stats.podiums;
    case 'abi':
      return stats.abi;
    case 'avg_profit':
      return stats.avgProfit;
    case 'biggest_cash':
      return stats.biggestCash;
    case 'total_invested':
      return stats.buyIns;
    default:
      return null;
  }
}
