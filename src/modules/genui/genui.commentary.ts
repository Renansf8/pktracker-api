import type { DashboardSpecType, WidgetSpec } from './genui.schema';
import type {
  GroupStatsRow,
  ValueUnit,
  WidgetData,
} from './entities/dashboard.entity';
import type {
  CommentarySegment,
  CommentaryUnit,
  DashboardCommentary,
} from './entities/commentary.entity';
import type { CommentaryOutput } from './genui.commentary.schema';
import {
  barLabel,
  safeCurrencies,
  safeCurrency,
  safePlatforms,
  sanitizeLabel,
} from './genui.format';

export { sanitizeLabel };

/**
 * Pure helpers for dashboard commentary. The model never sees raw data or
 * writes numbers: it gets numbered facts computed here and answers with
 * `{fN}` markers that renderCommentary checks and expands.
 */

export const MAX_FACTS = 120;
const MAX_SENTENCE_LENGTH = 280;
const MAX_INSIGHTS = 4;
const BARS_HEAD = 7;
const BARS_TAIL = 3;
const TABLE_ROWS = 8;
const LIST_ROWS = 10;

export interface Fact {
  /** f0, f1, ... in order; stable for a given spec and data. */
  id: string;
  /** Index in spec.widgets. */
  widget: number;
  /** What the number is (first, max, profit, ...): helps the model, not shown. */
  kind: string;
  label: string | null;
  value: number | string;
  unit: CommentaryUnit;
  currency: string | null;
  /** Tournaments behind a group, when known. */
  n?: number;
  /** The label is made of ISO dates (line chart buckets): shown as dd/MM/yyyy. */
  labelIsDate?: true;
}

type RawFact = Omit<Fact, 'id' | 'widget'>;

/** Server-written one-liner for a widget, from validated fields only. Titles are left out on purpose. */
export function describeWidget(widget: WidgetSpec, index: number): string {
  const platform = widget.platform
    ? `platform ${JSON.stringify(sanitizeLabel(widget.platform))}`
    : 'all platforms';
  const tail = `${widget.period.from}..${widget.period.to} · ${platform}`;
  switch (widget.type) {
    case 'stat':
      return `w${index} stat ${widget.metric} · ${tail}`;
    case 'line_chart':
      return `w${index} line_chart ${widget.metric} per ${widget.bucket} · ${tail}`;
    case 'bar_chart':
      return `w${index} bar_chart ${widget.metric} by ${widget.groupBy}, ${widget.order}, up to ${widget.limit ?? 'default'} bars · ${tail}`;
    case 'table':
      return `w${index} table by ${widget.groupBy}, sorted by ${widget.sortBy} ${widget.order}, up to ${widget.limit ?? 'default'} rows · ${tail}`;
    case 'tournament_list':
      return `w${index} tournament_list sorted by ${widget.sortBy} ${widget.order}, up to ${widget.limit ?? 'default'} tournaments · ${tail}`;
  }
}

function money(value: number | null): number | null {
  return value === null ? null : Math.round(value * 100) / 100;
}

function push(
  facts: RawFact[],
  kind: string,
  label: string | null,
  value: number | string | null,
  unit: CommentaryUnit,
  currency: string | null = null,
  n?: number,
) {
  if (value === null) return;
  facts.push({
    kind,
    label,
    value,
    unit,
    currency: safeCurrency(currency),
    ...(n === undefined ? {} : { n }),
  });
}

function rowLabel(row: GroupStatsRow, widgetPlatform: string | null): string {
  return sanitizeLabel(barLabel(row, widgetPlatform));
}

function lineFactsRaw(
  data: Extract<WidgetData, { type: 'line_chart' }>,
  cumulativeFrom: string | null,
): RawFact[] {
  const facts: RawFact[] = [];
  const points = data.points;
  if (points.length === 0) return facts;
  push(facts, 'point_count', null, points.length, 'count');
  const first = points[0];
  const last = points[points.length - 1];
  push(facts, 'first', first.bucket, first.value, data.unit);
  if (points.length === 1) return facts;

  push(facts, 'last', last.bucket, last.value, data.unit);
  if (points.length > 2) {
    const min = points.reduce((a, b) => (b.value < a.value ? b : a));
    const max = points.reduce((a, b) => (b.value > a.value ? b : a));
    push(facts, 'min', min.bucket, min.value, data.unit);
    push(facts, 'max', max.bucket, max.value, data.unit);
  }
  push(
    facts,
    'change',
    `${first.bucket} → ${last.bucket}`,
    // Cumulative profit starts at zero before the first bucket.
    money(last.value - (cumulativeFrom === null ? first.value : 0)),
    data.unit,
  );

  if (cumulativeFrom !== null) {
    let peak = { bucket: cumulativeFrom, value: 0 };
    let worst = { depth: 0, from: cumulativeFrom, to: cumulativeFrom };
    for (const point of points) {
      if (point.value > peak.value) peak = point;
      const depth = peak.value - point.value;
      if (depth > worst.depth) {
        worst = { depth, from: peak.bucket, to: point.bucket };
      }
    }
    if (worst.depth > 0) {
      push(
        facts,
        'drawdown',
        `${worst.from} → ${worst.to}`,
        money(worst.depth),
        'money',
      );
    }
  }
  return facts;
}

function lineFacts(
  data: Extract<WidgetData, { type: 'line_chart' }>,
  cumulativeFrom: string | null,
): RawFact[] {
  return lineFactsRaw(data, cumulativeFrom).map((fact) =>
    fact.label ? { ...fact, labelIsDate: true as const } : fact,
  );
}

/** 2026-09-14 → 14/09/2026, inside a label made of dates. */
function brDates(label: string): string {
  return label.replace(
    /(\d{4})-(\d{2})-(\d{2})/g,
    (_match, year, month, day) => `${day}/${month}/${year}`,
  );
}

function widgetFacts(widget: WidgetSpec, data: WidgetData): RawFact[] {
  const facts: RawFact[] = [];
  switch (data.type) {
    case 'stat':
      // No tournaments in the period: the 0 or null is "no data", not a result.
      if (data.tournaments === 0) break;
      push(facts, 'value', null, data.value, data.unit);
      push(facts, 'tournaments', null, data.tournaments ?? null, 'count');
      break;
    case 'line_chart':
      return lineFacts(
        data,
        widget.type === 'line_chart' && widget.metric === 'cumulative_profit'
          ? widget.period.from
          : null,
      );
    case 'bar_chart': {
      const bars = data.bars;
      if (bars.length > 0) push(facts, 'bar_count', null, bars.length, 'count');
      const shown =
        bars.length <= BARS_HEAD + BARS_TAIL
          ? bars
          : [...bars.slice(0, BARS_HEAD), ...bars.slice(-BARS_TAIL)];
      for (const bar of shown) {
        push(facts, 'bar', sanitizeLabel(bar.label), bar.value, data.unit);
      }
      break;
    }
    case 'table': {
      const rows = data.rows.filter((row) => row.tournaments > 0);
      if (rows.length === 0) break;
      push(facts, 'row_count', null, rows.length, 'count');
      push(
        facts,
        'tournaments_total',
        null,
        rows.reduce((sum, row) => sum + row.tournaments, 0),
        'count',
      );
      for (const row of rows.slice(0, TABLE_ROWS)) {
        const label = rowLabel(row, widget.platform);
        const currency = row.entry?.currency ?? null;
        const add = (kind: string, value: number | null, unit: ValueUnit) =>
          push(facts, kind, label, value, unit, currency, row.tournaments);
        add('tournaments', row.tournaments, 'count');
        add('profit', row.profit, 'money');
        add('roi', row.roi, 'percent');
        add('itm_rate', row.itmRate, 'percent');
        add('abi', row.abi, 'money');
      }
      break;
    }
    case 'tournament_list':
      if (data.rows.length > 0) {
        push(facts, 'row_count', null, data.rows.length, 'count');
      }
      for (const row of data.rows.slice(0, LIST_ROWS)) {
        const label = sanitizeLabel(`${row.name} (${row.platform})`);
        const add = (
          kind: string,
          value: number | string | null,
          unit: CommentaryUnit,
        ) => push(facts, kind, label, value, unit, row.currency);
        add('date', row.date, 'date');
        add('buy_in', row.buyIn, 'money');
        add('prize', typeof row.prize === 'number' ? row.prize : null, 'money');
        add('profit', row.profit, 'money');
        add('position', row.position, 'count');
      }
      break;
  }
  return facts;
}

/**
 * Turns each widget's result into a short list of numbered facts, computing
 * derived values (change, drawdown) here so the model never does arithmetic.
 * At most MAX_FACTS: when over, the last widgets are cut first.
 */
export function extractFacts(
  spec: DashboardSpecType,
  data: WidgetData[],
): Fact[] {
  const all: Omit<Fact, 'id'>[] = [];
  spec.widgets.forEach((widget, index) => {
    const widgetData = data[index];
    if (!widgetData) return;
    for (const fact of widgetFacts(widget, widgetData)) {
      all.push({ ...fact, widget: index });
    }
  });
  return all.slice(0, MAX_FACTS).map((fact, i) => ({ id: `f${i}`, ...fact }));
}

/** One JSON line per fact, as sent inside <data>. */
export function factLine(fact: Fact): string {
  return JSON.stringify({
    id: fact.id,
    w: fact.widget,
    kind: fact.kind,
    label: fact.label,
    value: fact.value,
    unit: fact.unit,
    ...(fact.currency ? { currency: fact.currency } : {}),
    ...(fact.n === undefined ? {} : { n: fact.n }),
  });
}

/** The user turn: everything that varies per request. */
export function buildCommentaryContent(input: {
  today: string;
  currencies: string[];
  spec: DashboardSpecType;
  facts: Fact[];
  prompt: string | undefined;
}): string {
  const widgets = input.spec.widgets.map(describeWidget).join('\n');
  const request = input.prompt ? sanitizeRequest(input.prompt) : '';
  return (
    `Today: ${input.today}\n` +
    `Currencies in the player's account: ${JSON.stringify(safeCurrencies(input.currencies))}\n` +
    `<widgets>\n${widgets}\n</widgets>\n` +
    `<data>\n${input.facts.map(factLine).join('\n')}\n</data>\n` +
    `<request>\n${request}\n</request>`
  );
}

function sanitizeRequest(prompt: string): string {
  return prompt.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
}

/** Any kind of digit (Unicode decimal, other numbers, letter numerals) or a stray brace. */
const FORBIDDEN = /[\p{Nd}\p{No}\p{Nl}{}]/u;
const MARKER = /\{(f\d+)(\.label)?\}/g;

function appendText(segments: CommentarySegment[], text: string) {
  if (!text) return;
  const last = segments[segments.length - 1];
  if (last?.type === 'text') last.text += text;
  else segments.push({ type: 'text', text });
}

/**
 * Platform names from the player's own account may have digits ("888poker");
 * those exact names are allowed in the text. Nothing else is.
 */
function withoutKnownNames(text: string, knownNames: RegExp | null): string {
  return knownNames ? text.replace(knownNames, ' ') : text;
}

function knownNamesPattern(platforms: string[]): RegExp | null {
  const names = safePlatforms(platforms)
    .filter((name) => FORBIDDEN.test(name))
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return names.length > 0 ? new RegExp(names.join('|'), 'giu') : null;
}

/** Cuts at the last space with an ellipsis; a marker has no spaces, so it is never split by this. */
function cutSentence(text: string): string {
  if (text.length <= MAX_SENTENCE_LENGTH) return text;
  const head = text.slice(0, MAX_SENTENCE_LENGTH - 1);
  const space = head.lastIndexOf(' ');
  return `${(space > 0 ? head.slice(0, space) : head).trimEnd()}…`;
}

/** One sentence → segments, or null when it breaks any rule. */
function toSegments(
  raw: string,
  byId: Map<string, Fact>,
  knownNames: RegExp | null,
): CommentarySegment[] | null {
  // A cut that lands inside a marker leaves a stray brace, which fails below.
  const text = cutSentence(raw.trim());
  if (!text) return null;

  const segments: CommentarySegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(MARKER)) {
    const plain = text.slice(cursor, match.index);
    if (FORBIDDEN.test(withoutKnownNames(plain, knownNames))) return null;
    appendText(segments, plain);
    const fact = byId.get(match[1]);
    if (!fact) return null;
    if (match[2]) {
      if (fact.label === null) return null;
      appendText(segments, fact.labelIsDate ? brDates(fact.label) : fact.label);
    } else {
      segments.push({
        type: 'fact',
        factId: fact.id,
        widget: fact.widget,
        label: fact.label,
        value: fact.value,
        unit: fact.unit,
        currency: fact.currency,
      });
    }
    cursor = match.index + match[0].length;
  }
  const tail = text.slice(cursor);
  if (FORBIDDEN.test(withoutKnownNames(tail, knownNames))) return null;
  appendText(segments, tail);
  return segments.length > 0 ? segments : null;
}

/**
 * Checks the model's answer against the facts and expands the markers.
 * Sentences with an unknown fact id or any digit outside a marker are
 * dropped. Returns null when nothing valid is left.
 */
export function renderCommentary(
  raw: CommentaryOutput,
  facts: Fact[],
  widgetCount: number,
  platforms: string[] = [],
): DashboardCommentary | null {
  const knownNames = knownNamesPattern(platforms);
  const byId = new Map(facts.map((fact) => [fact.id, fact]));

  let headline = toSegments(raw.headline, byId, knownNames);
  const insights = raw.insights
    .map((insight) => ({
      segments: toSegments(insight.text, byId, knownNames),
      widgets: [
        ...new Set(
          insight.widgets.filter(
            (w) => Number.isInteger(w) && w >= 0 && w < widgetCount,
          ),
        ),
      ],
    }))
    .filter(
      (
        insight,
      ): insight is { segments: CommentarySegment[]; widgets: number[] } =>
        insight.segments !== null,
    )
    .slice(0, MAX_INSIGHTS);

  if (!headline) {
    const promoted = insights.shift();
    if (!promoted) return null;
    headline = promoted.segments;
  }

  const caveat = cutSentence(raw.caveat?.trim() ?? '');
  return {
    headline,
    insights,
    caveat:
      caveat && !FORBIDDEN.test(withoutKnownNames(caveat, knownNames))
        ? caveat
        : null,
  };
}
