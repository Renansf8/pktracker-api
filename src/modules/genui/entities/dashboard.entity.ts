import type { DashboardSpecType } from '../genui.schema';

/** How the front should format a value. Amounts are in each tournament's
 *  own currency, summed as stored (same as the stats summary). */
export type ValueUnit = 'money' | 'percent' | 'count';

export interface StatData {
  type: 'stat';
  value: number | null;
  unit: ValueUnit;
}

export interface LineChartData {
  type: 'line_chart';
  unit: ValueUnit;
  points: { bucket: string; value: number }[];
}

export interface BarChartData {
  type: 'bar_chart';
  unit: ValueUnit;
  bars: { label: string; value: number | null }[];
}

export interface GroupStatsRow {
  label: string;
  /** Which tournament a tournament-name row is; null for other groupings.
   *  buyIn is null when the entries were paid with a ticket. */
  entry: { platform: string; currency: string; buyIn: number | null } | null;
  tournaments: number;
  buyIns: number;
  profit: number;
  roi: number | null;
  itmRate: number | null;
  abi: number | null;
}

export interface TableData {
  type: 'table';
  rows: GroupStatsRow[];
}

export type WidgetData = StatData | LineChartData | BarChartData | TableData;

export interface GeneratedDashboard {
  spec: DashboardSpecType;
  /** Same order as spec.widgets. */
  data: WidgetData[];
}
