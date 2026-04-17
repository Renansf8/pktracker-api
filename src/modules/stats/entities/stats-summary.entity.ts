export type TimeBucket = 'day' | 'week' | 'month' | 'year';

export interface BiggestBuyIn {
  value: number;
  tournament: {
    id: string;
    name: string;
    platform: string;
    date: Date;
  };
}

export interface ProfitBucketRecord {
  bucketStart: Date;
  amount: number;
}

export interface ProfitRecords {
  day: ProfitBucketRecord | null;
  week: ProfitBucketRecord | null;
  month: ProfitBucketRecord | null;
  year: ProfitBucketRecord | null;
}

export interface MostTournamentsInADay {
  date: Date;
  count: number;
}

export interface HighestAbiDay {
  date: Date;
  abi: number;
  tournaments: number;
}

export interface StatsSummary {
  biggestBuyIn: BiggestBuyIn | null;
  profitRecords: ProfitRecords;
  lossRecords: ProfitRecords;
  mostTournamentsInADay: MostTournamentsInADay | null;
  highestAbiDay: HighestAbiDay | null;
}
