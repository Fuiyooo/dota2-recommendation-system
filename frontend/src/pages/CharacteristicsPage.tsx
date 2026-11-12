import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiGet } from "../api/client";
import type {
  CharacteristicName,
  CharacteristicsResponse,
} from "../api/types";
import { Badge, calculationTone } from "../components/Badge";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../components/StatePanel";
import { ScrollHint } from "../components/ScrollHint";
import { formatDate, formatDecimal } from "../utils/format";

const CHARACTERISTICS: Array<{
  key: CharacteristicName;
  label: string;
}> = [
  { key: "damage", label: "Damage" },
  { key: "durability", label: "Durability" },
  { key: "crowdControl", label: "Crowd Control" },
  { key: "mobility", label: "Mobility / Escape" },
];

function ScoreCell({
  value,
  status,
}: {
  value: number | null;
  status: string;
}) {
  if (value === null) {
    return <Badge tone={calculationTone(status)}>{status}</Badge>;
  }
  return (
    <span className="whitespace-nowrap">
      <span className="num font-medium">{formatDecimal(value)}</span>{" "}
      <Badge tone={calculationTone(status)}>{status}</Badge>
    </span>
  );
}

export function CharacteristicsPage() {
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["characteristics"],
    queryFn: () => apiGet<CharacteristicsResponse>("/characteristics/heroes"),
  });

  const heroes = useMemo(() => {
    const items = query.data?.heroes ?? [];
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((hero) =>
      hero.heroName.toLowerCase().includes(needle),
    );
  }, [query.data?.heroes, search]);

  return (
    <div>
      <div>
        <h1 className="text-xl font-semibold">Skor karakteristik</h1>
        <p className="muted mt-1 text-sm">
          Skor 1 sampai 10 dari percentile seluruh hero. Nilai mentah, percentile,
          dan status coverage dapat dibuka pada detail hero.
        </p>
      </div>
      <ScrollHint />

      {query.isPending ? <LoadingPanel label="skor karakteristik" /> : null}
      {query.isError ? (
        <ErrorPanel
          message={
            query.error instanceof Error ? query.error.message : "Error tidak dikenal"
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.isSuccess && !query.data.run ? (
        <div className="mt-4">
          <EmptyPanel title="Belum ada hasil kalkulasi">
            Jalankan <span className="num">npm run calculate</span> dari root
            project untuk menghitung seluruh hero.
          </EmptyPanel>
        </div>
      ) : null}

      {query.data?.run ? (
        <>
          <div className="panel mt-4 grid gap-3 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-stone-600">Run</p>
              <p className="num font-medium">#{query.data.run.id}</p>
            </div>
            <div>
              <p className="text-xs text-stone-600">Patch dan config</p>
              <p className="num font-medium">
                {query.data.run.patch} · {query.data.run.configVersion}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-600">Status</p>
              <Badge tone={query.data.run.status === "SUCCESS" ? "ok" : "warn"}>
                {query.data.run.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-stone-600">Dihitung</p>
              <p className="num font-medium">
                {formatDate(query.data.run.finishedAt)}
              </p>
            </div>
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

          {heroes.length === 0 ? (
            <div className="mt-3">
              <EmptyPanel title="Tidak ada hero yang cocok">
                Hapus kata kunci pencarian.
              </EmptyPanel>
            </div>
          ) : (
            <div className="scroll-x panel mt-3">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Hero</th>
                    {CHARACTERISTICS.map((characteristic) => (
                      <th key={characteristic.key} scope="col">
                        {characteristic.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heroes.map((hero) => (
                    <tr key={hero.heroId}>
                      <th scope="row">
                        <Link
                          className="text-accent underline decoration-stone-400 underline-offset-2"
                          to={`/characteristics/${hero.heroId}`}
                        >
                          {hero.heroName}
                        </Link>
                        <span className="muted block text-xs">
                          {hero.primaryAttr} · {hero.attackType}
                        </span>
                      </th>
                      {CHARACTERISTICS.map((characteristic) => {
                        const score = hero.scores[characteristic.key];
                        return (
                          <td key={characteristic.key}>
                            {score ? (
                              <ScoreCell
                                value={score.score}
                                status={score.status}
                              />
                            ) : (
                              <span className="muted">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
