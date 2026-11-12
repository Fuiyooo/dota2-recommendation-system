export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(limit, items.length));

  const runners = Array.from({ length: workerCount }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

export function numberValues(value: string | string[] | undefined): number[] {
  if (value === undefined) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((item) => Number.parseFloat(item))
    .filter((item) => Number.isFinite(item));
}

export function sameNumberArray(left: number[], right: number[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => Math.abs(value - right[index]) < 0.001);
}
