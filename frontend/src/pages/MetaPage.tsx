import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiGet } from "../api/client";
import type { MetaResponse, MetaStat } from "../api/types";
import { HeroThumb } from "../components/HeroThumb";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../components/StatePanel";
import { ScrollHint } from "../components/ScrollHint";
import { useHeroIndex } from "../hooks/useHeroIndex";
import { formatNumber, formatPercent } from "../utils/format";

const POSITIONS = [
  { value: null, label: "Semua" },
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

  const groups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const byPosition = new Map<number, MetaStat[]>();

    for (const row of query.data?.stats ?? []) {
      if (row.position === null) continue;
      if (
        needle &&
        !row.hero.localizedName.toLowerCase().includes(needle)
      ) {
        continue;
      }
      const list = byPosition.get(row.position) ?? [];
      list.push(row);
      byPosition.set(row.position, list);
    }

    return [...byPosition.entries()]
      .sort(([left], [right]) => left - right)
      .map(([pos, rows]) => [
        pos,
        [...rows].sort((left, right) => {
          const pickDiff = (right.pickRate ?? 0) - (left.pickRate ?? 0);
          if (pickDiff !== 0) return pickDiff;
          return right.matchCount - left.matchCount;
        }),
      ] as const);
  }, [query.data?.stats, search]);

  const snapshot = query.data?.snapshot;

  return (
    <div>
      <h1 className="text-xl font-semibold">Meta</h1>
      <ScrollHint />

      {query.isPending ? <LoadingPanel label="snapshot meta" /> : null}
      {query.isError ? (
        <ErrorPanel
          message={
            query.error instanceof Error ? query.error.message : "Error tidak dikenal"
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.isSuccess && !snapshot ? (
        <div className="mt-4">
          <EmptyPanel title="Belum ada snapshot meta">
            Jalankan <span className="num">npm run sync:meta</span> di root
            project.
          </EmptyPanel>
        </div>
      ) : null}

      {snapshot ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted">Posisi</span>
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
            <span className="text-xs text-muted">Cari hero</span>
            <input
              className="field mt-1 w-full"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nama hero"
            />
          </label>

          {groups.length === 0 ? (
            <div className="mt-4">
              <EmptyPanel title="Tidak ada baris untuk filter ini">
                Ubah posisi atau hapus kata kunci pencarian.
              </EmptyPanel>
            </div>
          ) : (
            groups.map(([pos, rows]) => (
              <section
                key={pos}
                className="mt-5"
                aria-labelledby={`meta-pos-${pos}`}
              >
                <h2
                  id={`meta-pos-${pos}`}
                  className="text-base font-semibold"
                >
                  Pos {pos}
                </h2>
                <div className="scroll-x panel mt-2">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col" className="w-12 px-2">
                          Rank
                        </th>
                        <th scope="col">Hero</th>
                        <th scope="col">Pick rate</th>
                        <th scope="col">Win rate</th>
                        <th scope="col">Match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={row.id}>
                          <td className="num w-12 px-2">{index + 1}</td>
                          <th scope="row">
                            <div className="flex min-w-0 items-center gap-2">
                              <HeroThumb hero={heroIndex.get(row.heroId)} />
                              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                                <Link
                                  className="min-w-0 break-words text-link underline decoration-line-strong underline-offset-2"
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
                          <td className="num">{formatPercent(row.pickRate)}</td>
                          <td className="num">{formatPercent(row.winRate)}</td>
                          <td className="num">{formatNumber(row.matchCount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))
          )}
        </>
      ) : null}
    </div>
  );
}
