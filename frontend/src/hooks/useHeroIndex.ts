import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../api/client";
import type { HeroSummary } from "../api/types";

export function useHeroIndex(): Map<number, HeroSummary> {
  const query = useQuery({
    queryKey: ["heroes"],
    queryFn: () => apiGet<HeroSummary[]>("/heroes"),
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(
    () => new Map((query.data ?? []).map((hero) => [hero.id, hero])),
    [query.data],
  );
}
