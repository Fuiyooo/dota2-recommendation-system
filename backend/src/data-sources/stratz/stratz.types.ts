export interface StratzPositionRow {
  heroId: number;
  position: string;
  week: number;
  matchCount: number;
  winCount: number;
}

export interface StratzStatsResponse {
  data?: {
    heroStats?: {
      stats?: StratzPositionRow[];
    };
  };
  errors?: Array<{ message?: string }>;
}
