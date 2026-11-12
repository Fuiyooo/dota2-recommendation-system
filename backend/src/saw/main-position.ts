export interface PositionStatRow {
  heroId: number;
  position: number | null;
  pickRate: number | null;
  matchCount: number;
}

export interface MainPositionStat {
  position: number | null;
  pickRate: number;
  pickCount: number;
}

export function pickMainPositionStats(
  rows: PositionStatRow[],
): Map<number, MainPositionStat> {
  const best = new Map<number, MainPositionStat>();

  for (const row of rows) {
    if (row.position === null) continue;
    const pickRate = row.pickRate ?? 0;
    const current = best.get(row.heroId);
    if (
      !current ||
      pickRate > current.pickRate ||
      (pickRate === current.pickRate &&
        row.matchCount > current.pickCount) ||
      (pickRate === current.pickRate &&
        row.matchCount === current.pickCount &&
        row.position < (current.position ?? Number.MAX_SAFE_INTEGER))
    ) {
      best.set(row.heroId, {
        position: row.position,
        pickRate,
        pickCount: row.matchCount,
      });
    }
  }

  return best;
}

export function pickMainPositions(
  rows: PositionStatRow[],
): Map<number, number> {
  const result = new Map<number, number>();
  for (const [heroId, stat] of pickMainPositionStats(rows)) {
    if (stat.position !== null) result.set(heroId, stat.position);
  }
  return result;
}
