import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../api/client";
import type { MetaResponse } from "../api/types";

interface MainPosition {
  position: number;
  pickRate: number;
  matchCount: number;
}

export function useHeroPositions(): Map<number, number> {
  const query = useQuery({
    queryKey: ["meta", null],
    queryFn: () => apiGet<MetaResponse>("/meta/heroes"),
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    const best = new Map<number, MainPosition>();

    for (const row of query.data?.stats ?? []) {
      if (row.position === null) continue;
      const pickRate = row.pickRate ?? 0;
      const current = best.get(row.heroId);
      const better =
        !current ||
        pickRate > current.pickRate ||
        (pickRate === current.pickRate && row.matchCount > current.matchCount) ||
        (pickRate === current.pickRate &&
          row.matchCount === current.matchCount &&
          row.position < current.position);

      if (better) {
        best.set(row.heroId, {
          position: row.position,
          pickRate,
          matchCount: row.matchCount,
        });
      }
    }

    return new Map(
      [...best.entries()].map(([heroId, stat]) => [heroId, stat.position]),
    );
  }, [query.data]);
}
