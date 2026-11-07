export type CommentaryUnit = 'money' | 'percent' | 'count' | 'date';

export type CommentarySegment =
  | { type: 'text'; text: string }
  | {
      type: 'fact';
      factId: string;
      /** Index in spec.widgets the number comes from. */
      widget: number;
      /** e.g. "GG", "Bounty Hunters $115 (Party Poker)". */
      label: string | null;
      /** string only for dates (YYYY-MM-DD). */
      value: number | string | null;
      unit: CommentaryUnit;
      /** Set when the fact comes from a row with a known currency. */
      currency: string | null;
    };

export interface CommentaryInsight {
  segments: CommentarySegment[];
  /** Indexes in spec.widgets this sentence refers to. */
  widgets: number[];
}

export interface DashboardCommentary {
  /** One sentence. */
  headline: CommentarySegment[];
  /** 0 to 4 sentences (0 when the only valid sentence became the headline). */
  insights: CommentaryInsight[];
  caveat: string | null;
}

export interface CommentaryResponse {
  /** null = nothing to comment on (no widgets or no data). */
  commentary: DashboardCommentary | null;
}
