import { z } from 'zod';

/**
 * Contract between the LLM and the app. The model only picks widgets and
 * metrics from this closed catalog; it never writes SQL or UI code. Every
 * metric here must have a resolver in GenUiService.
 *
 * Numeric/string constraints are intentionally left out of the schema
 * (structured outputs don't support them) — GenUiService.normalizeSpec
 * enforces limits after parsing.
 */

const Period = z.object({
  from: z.string().describe('Data inicial inclusiva, formato YYYY-MM-DD'),
  to: z.string().describe('Data final inclusiva, formato YYYY-MM-DD'),
});

// Metrics computed from the per-group sums (see toGroupStats).
const GROUP_METRICS = [
  'roi',
  'itm_rate',
  'ft_rate',
  'day2_rate',
  'tournament_count',
  'wins',
  'podiums',
  'abi',
  'avg_profit',
  'biggest_cash',
  'total_invested',
] as const;

export const StatMetric = z.enum(['total_profit', ...GROUP_METRICS]);

export const LineMetric = z.enum([
  'cumulative_profit',
  'profit',
  'tournament_count',
]);

export const BarMetric = z.enum(['profit', ...GROUP_METRICS]);

const GroupBy = z.enum([
  'platform',
  'currency',
  'tournament_name',
  'buy_in_range',
]);
const Bucket = z.enum(['day', 'week', 'month']);
const Order = z.enum(['desc', 'asc']);
export const TableSortBy = z.enum([
  'profit',
  'roi',
  'tournaments',
  'buy_ins',
  'itm_rate',
  'ft_rate',
  'abi',
]);
export const TournamentListSort = z.enum(['profit', 'prize', 'buy_in', 'date']);

// Required-but-nullable instead of optional: every widget states its filter.
const PlatformFilter = z
  .string()
  .nullable()
  .describe('Só torneios desta plataforma; null para todas');
const Limit = z
  .number()
  .nullable()
  .describe('Máximo de linhas/barras; null para o padrão');

const StatWidget = z.object({
  type: z.literal('stat'),
  title: z.string(),
  metric: StatMetric,
  period: Period,
  platform: PlatformFilter,
});

const LineChartWidget = z.object({
  type: z.literal('line_chart'),
  title: z.string(),
  metric: LineMetric,
  bucket: Bucket,
  period: Period,
  platform: PlatformFilter,
});

const BarChartWidget = z.object({
  type: z.literal('bar_chart'),
  title: z.string(),
  metric: BarMetric,
  groupBy: GroupBy,
  order: Order,
  limit: Limit,
  period: Period,
  platform: PlatformFilter,
});

const TableWidget = z.object({
  type: z.literal('table'),
  title: z.string(),
  groupBy: GroupBy,
  sortBy: TableSortBy,
  order: Order,
  limit: Limit,
  period: Period,
  platform: PlatformFilter,
});

const TournamentListWidget = z.object({
  type: z.literal('tournament_list'),
  title: z.string(),
  sortBy: TournamentListSort,
  order: Order,
  limit: Limit,
  period: Period,
  platform: PlatformFilter,
});

export const Widget = z.discriminatedUnion('type', [
  StatWidget,
  LineChartWidget,
  BarChartWidget,
  TableWidget,
  TournamentListWidget,
]);

export const DashboardSpec = z.object({
  title: z.string(),
  summary: z
    .string()
    .describe('1 a 2 frases em português explicando o que o dashboard mostra'),
  widgets: z.array(Widget),
});

export type PeriodSpec = z.infer<typeof Period>;
export type WidgetSpec = z.infer<typeof Widget>;
export type DashboardSpecType = z.infer<typeof DashboardSpec>;
export type GroupByType = z.infer<typeof GroupBy>;
export type BucketType = z.infer<typeof Bucket>;
export type TableSortByType = z.infer<typeof TableSortBy>;
export type TournamentListSortType = z.infer<typeof TournamentListSort>;

/**
 * JSON schema sent as the structured-output format. Built here instead of
 * with the SDK's zodOutputFormat helper because that helper moves `enum` and
 * `const` into descriptions, which would let the model return values outside
 * the catalog. Inlined (no $refs), with oneOf and type arrays (nullable
 * fields) rewritten to the supported anyOf.
 */
export const DASHBOARD_JSON_SCHEMA = toStructuredOutputSchema(
  z.toJSONSchema(DashboardSpec, { reused: 'inline', io: 'output' }),
);

function toStructuredOutputSchema(node: unknown): Record<string, unknown> {
  if (Array.isArray(node)) {
    return node.map(toStructuredOutputSchema) as unknown as Record<
      string,
      unknown
    >;
  }
  if (node === null || typeof node !== 'object') {
    return node as Record<string, unknown>;
  }
  const result: Record<string, unknown> = {};
  const { type, ...rest } = node as Record<string, unknown>;
  if (Array.isArray(type)) {
    result.anyOf = type.map((t) => ({ type: t }));
    node = rest;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === '$schema') continue;
    result[key === 'oneOf' ? 'anyOf' : key] = toStructuredOutputSchema(value);
  }
  return result;
}
