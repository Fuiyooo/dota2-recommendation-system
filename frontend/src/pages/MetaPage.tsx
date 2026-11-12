import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiGet } from "../api/client";
import type { MetaResponse } from "../api/types";
import { Badge } from "../components/Badge";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../components/StatePanel";
import { ScrollHint } from "../components/ScrollHint";
import {
  formatDate,
  formatNumber,
  formatPercent,
} from "../utils/format";

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
      <div>
        <h1 className="text-xl font-semibold">Meta Immortal</h1>
        <p className="muted mt-1 text-sm">
          Snapshot statistik posisi dari STRATZ. Data tidak diperbarui otomatis,
          jadi angka tetap sama sampai snapshot baru dibuat secara manual.
        </p>
      </div>
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
          <EmptyPanel title="Snapshot meta belum ada">
            Jalankan <span className="num">npm run sync:meta</span> dari root
            project. Statistik posisi diambil untuk bracket Immortal.
          </EmptyPanel>
        </div>
      ) : null}

      {snapshot ? (
        <>
          <div className="panel mt-4 grid gap-3 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-stone-600">Patch</p>
              <p className="num font-medium">{snapshot.patch}</p>
            </div>
            <div>
              <p className="text-xs text-stone-600">Bracket</p>
              <p className="font-medium">{snapshot.bracket}</p>
            </div>
            <div>
              <p className="text-xs text-stone-600">Week</p>
              <p className="num font-medium">{snapshot.week}</p>
            </div>
            <div>
              <p className="text-xs text-stone-600">Snapshot dibuat</p>
              <p className="num font-medium">{formatDate(snapshot.capturedAt)}</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="text-xs text-stone-600">Sumber</p>
              <p className="font-medium">
                {snapshot.source} · {snapshot.timeWindow}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-stone-600">Posisi</span>
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
            <span className="text-xs text-stone-600">Cari hero</span>
            <input
              className="field mt-1 w-full"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nama hero"
            />
          </label>

          {stats.length === 0 ? (
            <div className="mt-4">
              <EmptyPanel title="Tidak ada baris untuk filter ini">
                Ubah posisi atau hapus kata kunci pencarian.
              </EmptyPanel>
            </div>
          ) : (
            <div className="scroll-x panel mt-4">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Hero</th>
                    <th scope="col">Posisi</th>
                    <th scope="col">Pick rate</th>
                    <th scope="col">Win rate</th>
                    <th scope="col">Match</th>
                    <th scope="col">Sumber</th>
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
                          <Link
                            className="text-accent underline decoration-stone-400 underline-offset-2"
                            to={`/heroes/${row.heroId}`}
                          >
                            {row.hero.localizedName}
                          </Link>
                          <span className="muted block text-xs">
                            {row.hero.primaryAttr} · {row.hero.attackType}
                          </span>
                        </th>
                        <td>
                          <Badge tone="neutral">Pos {row.position ?? "-"}</Badge>
                        </td>
                        <td className="num">{formatPercent(row.pickRate)}</td>
                        <td className="num">{formatPercent(row.winRate)}</td>
                        <td className="num">{formatNumber(row.matchCount)}</td>
                        <td className="muted text-xs">{row.source}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="muted mt-2 text-xs">
            Rank dihitung per posisi. Pick rate dihitung dari match hero dibagi
            total match semua hero pada posisi dan snapshot yang sama. Win rate
            dihitung dari win count dibagi match count.
          </p>
        </>
      ) : null}
    </div>
  );
}
