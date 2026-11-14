import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiGet, apiPost } from "../api/client";
import type {
  CharacteristicName,
  SawResponse,
} from "../api/types";
import { Badge } from "../components/Badge";
import { HeroThumb } from "../components/HeroThumb";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../components/StatePanel";
import { ScrollHint } from "../components/ScrollHint";
import { useHeroIndex } from "../hooks/useHeroIndex";
import {
  formatDecimal,
  formatNumber,
  formatPercent,
} from "../utils/format";

const CHARACTERISTICS: Array<{ key: CharacteristicName; label: ReactNode }> = [
  { key: "damage", label: "Damage" },
  { key: "durability", label: "Durability" },
  { key: "crowdControl", label: "Crowd Control" },
  { key: "mobility", label: (<>Mobility /<br />Escape</>) },
];

const DEFAULT_WEIGHTS: Record<CharacteristicName, number> = {
  damage: 0.25,
  durability: 0.25,
  crowdControl: 0.25,
  mobility: 0.25,
};

const COMPLEXITY_LABEL: Record<number, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
};

export function SawPage() {
  const [weights, setWeights] =
    useState<Record<CharacteristicName, number>>(DEFAULT_WEIGHTS);
  const [position, setPosition] = useState<number | "all">("all");
  const [complexity, setComplexity] = useState<number | "all">("all");
  const [attackType, setAttackType] = useState<"all" | "Melee" | "Ranged">(
    "all",
  );
  const queryClient = useQueryClient();
  const heroIndex = useHeroIndex();

  const query = useQuery({
    queryKey: ["saw"],
    queryFn: () => apiGet<SawResponse>("/saw/rankings"),
  });

  const mutation = useMutation({
    mutationFn: (payload: Record<CharacteristicName, number>) =>
      apiPost<SawResponse>("/saw/calculate", payload),
    onSuccess: (data) => {
      queryClient.setQueryData(["saw"], data);
    },
  });

  const hydratedWeights = useRef(false);

  useEffect(() => {
    if (hydratedWeights.current) return;
    const stored = query.data?.sawRun?.weights;
    if (!stored) return;
    setWeights(stored);
    hydratedWeights.current = true;
  }, [query.data]);

  const data = mutation.data ?? query.data;
  const results = data?.results ?? [];
  const totalWeight = CHARACTERISTICS.reduce(
    (sum, item) => sum + Math.round(weights[item.key] * 100),
    0,
  );

  const filtered = useMemo(
    () =>
      results
        .filter(
          (result) =>
            (position === "all" || result.mainPosition === position) &&
            (complexity === "all" || result.complexity === complexity) &&
            (attackType === "all" || result.attackType === attackType),
        )
        .sort(
          (left, right) =>
            right.finalScore - left.finalScore ||
            right.pickRate - left.pickRate ||
            right.pickCount - left.pickCount ||
            left.heroName.localeCompare(right.heroName),
        ),
    [results, position, complexity, attackType],
  );

  return (
    <div>
      <h1 className="text-xl font-semibold">Rekomendasi</h1>
      <ScrollHint />

      {query.isPending ? <LoadingPanel label="peringkat rekomendasi" /> : null}
      {query.isError ? (
        <ErrorPanel
          message={
            query.error instanceof Error ? query.error.message : "Error tidak dikenal"
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}

      <section className="mt-4" aria-labelledby="weights-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="weights-title" className="text-base font-semibold">
            Bobot kriteria
          </h2>
          <button
            type="button"
            className="button small"
            onClick={() => setWeights({ ...DEFAULT_WEIGHTS })}
          >
            Reset 25%
          </button>
        </div>

        <div className="panel mt-2 grid gap-4 p-3 sm:grid-cols-2">
          {CHARACTERISTICS.map((characteristic) => (
            <label key={characteristic.key} className="block">
              <span className="flex items-baseline justify-between gap-2 text-sm">
                <span>{characteristic.label}</span>
                <span className="num text-ink-soft">
                  {Math.round(weights[characteristic.key] * 100)}
                </span>
              </span>
              <input
                className="mt-1 w-full accent-accent"
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(weights[characteristic.key] * 100)}
                onChange={(event) => {
                  const value = Number.parseFloat(event.target.value);
                  if (!Number.isFinite(value)) return;
                  const percent = Math.max(0, Math.min(100, Math.round(value)));
                  setWeights((current) => ({
                    ...current,
                    [characteristic.key]: percent / 100,
                  }));
                }}
              />
            </label>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="button button-primary"
            disabled={mutation.isPending || totalWeight <= 0}
            onClick={() => mutation.mutate(weights)}
          >
            {mutation.isPending ? "Menghitung..." : "Hitung peringkat"}
          </button>
          <span className="muted text-sm">Total {totalWeight}</span>
        </div>

        {mutation.isError ? (
          <p className="status error mt-3" role="alert">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Gagal menghitung peringkat."}
          </p>
        ) : null}
      </section>

      <section className="mt-5" aria-labelledby="filter-title">
        <h2 id="filter-title" className="text-base font-semibold">
          Filter
        </h2>
        <div className="mt-2 flex flex-wrap gap-3">
          <label className="block">
            <span className="text-xs text-muted">Posisi</span>
            <select
              className="field mt-1 block min-w-40"
              value={position}
              onChange={(event) => {
                const value = event.target.value;
                setPosition(value === "all" ? "all" : Number(value));
              }}
            >
              <option value="all">Semua posisi</option>
              {[1, 2, 3, 4, 5].map((item) => (
                <option key={item} value={item}>
                  Pos {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-muted">Complexity</span>
            <select
              className="field mt-1 block min-w-40"
              value={complexity}
              onChange={(event) => {
                const value = event.target.value;
                setComplexity(value === "all" ? "all" : Number(value));
              }}
            >
              <option value="all">Semua complexity</option>
              {[1, 2, 3].map((item) => (
                <option key={item} value={item}>
                  {item} ({COMPLEXITY_LABEL[item]})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-muted">Tipe serangan</span>
            <select
              className="field mt-1 block min-w-40"
              value={attackType}
              onChange={(event) =>
                setAttackType(
                  event.target.value as "all" | "Melee" | "Ranged",
                )
              }
            >
              <option value="all">Semua tipe</option>
              <option value="Melee">Melee</option>
              <option value="Ranged">Ranged</option>
            </select>
          </label>
        </div>
      </section>

      {!query.isPending && results.length === 0 ? (
        <div className="mt-4">
          <EmptyPanel title="Belum ada peringkat rekomendasi">
            Jalankan <span className="num">npm run calculate</span>, lalu tekan
            Hitung peringkat.
          </EmptyPanel>
        </div>
      ) : null}

      {results.length > 0 && filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyPanel title="Tidak ada hero untuk filter ini">
            Ubah posisi, complexity, atau tipe serangan.
          </EmptyPanel>
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <div className="scroll-x panel mt-4">
          <table className="data-table min-w-[1100px] lg:min-w-0">
            <thead>
              <tr>
                <th scope="col" className="w-12 px-2">Rank</th>
                <th scope="col">Hero</th>
                <th scope="col">Final Score</th>
                <th scope="col">Pick rate</th>
                {CHARACTERISTICS.map((characteristic) => (
                  <th key={characteristic.key} scope="col" className="px-2">
                    {characteristic.label}
                  </th>
                ))}
                <th scope="col">Position</th>
                <th scope="col">Complexity</th>
                <th scope="col">Attack</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((result, index) => (
                <tr key={result.heroId}>
                  <td className="num w-12 px-2">{index + 1}</td>
                  <th scope="row">
                    <div className="flex min-w-0 items-center gap-2">
                      <HeroThumb hero={heroIndex.get(result.heroId)} />
                      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                        <Link
                          className="min-w-0 break-words font-medium text-link underline underline-offset-2"
                          to={`/characteristics/${result.heroId}`}
                        >
                          {result.heroName}
                        </Link>
                      </div>
                    </div>
                  </th>
                  <td className="num font-medium">
                    {formatDecimal(result.finalScore)}
                  </td>
                  <td className="num">
                    {formatPercent(result.pickRate)}
                    <span className="muted block text-xs">
                      {formatNumber(result.pickCount)} match
                    </span>
                  </td>
                  {CHARACTERISTICS.map((characteristic) => (
                    <td key={characteristic.key} className="num px-2">
                      {formatDecimal(
                        result.normalizedScores[characteristic.key] ?? 0,
                      )}
                    </td>
                  ))}
                  <td>
                    <Badge tone="neutral">
                      {result.mainPosition === null
                        ? "-"
                        : `Pos ${result.mainPosition}`}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone="neutral">
                      {result.complexity === null
                        ? "-"
                        : `${result.complexity} (${COMPLEXITY_LABEL[result.complexity] ?? "-"})`}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone="neutral">{result.attackType}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
