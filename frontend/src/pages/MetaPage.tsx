import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiGet } from "../api/client";
import type { MetaResponse } from "../api/types";
import { Badge } from "../components/Badge";
import { HeroThumb } from "../components/HeroThumb";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../components/StatePanel";
import { ScrollHint } from "../components/ScrollHint";
import { useHeroIndex } from "../hooks/useHeroIndex";
import {
  formatDate,
  formatNumber,
  formatPercent,
} from "../utils/format";

const POSITIONS = [
  { value: null, label: "All" },
  { value: 1, label: "Pos 1" },
  { value: 2, label: "Pos 2" },
  { value: 3, label: "Pos 3" },
  { value: 4, label: "Pos 4" },
  { value: 5, label: "Pos 5" },
];

export function MetaPage() {
  const [position, setPosition] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const heroIndex = useHeroIndex();

  const query = useQuery({
    queryKey: ["meta", position],
    queryFn: () =>
      apiGet<MetaResponse>(
        position ? `/meta/heroes?position=${position}` : "/meta/heroes",
      ),
  });

  const stats = useMemo(() => {
    const items = query.data?.stats ?? [];
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      item.hero.localizedName.toLowerCase().includes(needle),
    );
  }, [query.data?.stats, search]);

  const snapshot = query.data?.snapshot;

  return (
    <div>
      <h1 className="text-xl font-semibold">Immortal Meta</h1>
      <ScrollHint />

      {query.isPending ? <LoadingPanel label="meta snapshot" /> : null}
      {query.isError ? (
        <ErrorPanel
          message={
            query.error instanceof Error ? query.error.message : "Unknown error"
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.isSuccess && !snapshot ? (
        <div className="mt-4">
          <EmptyPanel title="No meta snapshot yet">
            Run <span className="num">npm run sync:meta</span> from the project
            root. Position statistics are collected for the Immortal bracket.
          </EmptyPanel>
        </div>
      ) : null}

      {snapshot ? (
        <>
          <div className="panel mt-4 grid gap-3 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted">Patch</p>
              <p className="num font-medium">{snapshot.patch}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Bracket</p>
              <p className="font-medium">{snapshot.bracket}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Week</p>
              <p className="num font-medium">{snapshot.week}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Captured</p>
              <p className="num font-medium">{formatDate(snapshot.capturedAt)}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted">Position</span>
            {POSITIONS.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`button ${position === item.value ? "button-primary" : ""}`}
                aria-pressed={position === item.value}
                onClick={() => setPosition(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="mt-3 block max-w-sm">
            <span className="text-xs text-muted">Search hero</span>
            <input
              className="field mt-1 w-full"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Hero name"
            />
          </label>

          {stats.length === 0 ? (
            <div className="mt-4">
              <EmptyPanel title="No rows for this filter">
                Change the position or clear the search keyword.
              </EmptyPanel>
            </div>
          ) : (
            <div className="scroll-x panel mt-4">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Hero</th>
                    <th scope="col">Position</th>
                    <th scope="col">Pick rate</th>
                    <th scope="col">Win rate</th>
                    <th scope="col">Matches</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((row) => {
                    const rank =
                      (query.data?.stats ?? []).filter(
                        (item) =>
                          item.position === row.position &&
                          (item.pickRate ?? 0) > (row.pickRate ?? 0),
                      ).length + 1;
                    return (
                      <tr key={row.id}>
                        <td className="num muted">{rank}</td>
                        <th scope="row">
                          <div className="flex min-w-0 items-center gap-2">
                            <HeroThumb hero={heroIndex.get(row.heroId)} />
                            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                              <Link
                                className="break-words text-link underline decoration-line-strong underline-offset-2"
                                to={`/heroes/${row.heroId}`}
                              >
                                {row.hero.localizedName}
                              </Link>
                              <span className="muted text-xs">
                                {row.hero.primaryAttr} · {row.hero.attackType}
                              </span>
                            </div>
                          </div>
                        </th>
                        <td>
                          <Badge tone="neutral">Pos {row.position ?? "-"}</Badge>
                        </td>
                        <td className="num">{formatPercent(row.pickRate)}</td>
                        <td className="num">{formatPercent(row.winRate)}</td>
                        <td className="num">{formatNumber(row.matchCount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
