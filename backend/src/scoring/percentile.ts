export function percentileRank(
  rawValue: number,
  positiveValues: number[],
): number {
  if (rawValue <= 0 || positiveValues.length === 0) return 0;
  if (positiveValues.length === 1) return 100;

  const below = positiveValues.filter((value) => value < rawValue).length;
  const equal = positiveValues.filter((value) => value === rawValue).length;
  return ((below + 0.5 * (equal - 1)) / (positiveValues.length - 1)) * 100;
}
