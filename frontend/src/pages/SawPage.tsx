import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiGet, apiPost } from "../api/client";
import type {
  CharacteristicName,
  SawResponse,
} from "../api/types";
import { Badge } from "../components/Badge";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../components/StatePanel";
import { ScrollHint } from "../components/ScrollHint";
import {
  formatDecimal,
  formatNumber,
  formatPercent,
} from "../utils/format";

const CHARACTERISTICS: Array<{ key: CharacteristicName; label: string }> = [
  { key: "damage", label: "Damage" },
  { key: "durability", label: "Durability" },
  { key: "crowdControl", label: "Crowd Control" },
  { key: "mobility", label: "Mobility / Escape" },
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

function redistributeWeights(
  current: Record<CharacteristicName, number>,
  changed: CharacteristicName,
  targetPercent: number,
): Record<CharacteristicName, number> {
  const keys = CHARACTERISTICS.map((item) => item.key);
  const percent = Object.fromEntries(
    keys.map((key) => [key, Math.round(current[key] * 100)]),
  ) as Record<CharacteristicName, number>;
  const target = Math.max(0, Math.min(100, Math.round(targetPercent)));
  const others = keys.filter((key) => key !== changed);
  const remaining = 100 - target;
  const otherSum = others.reduce((sum, key) => sum + percent[key], 0);
  percent[changed] = target;

  if (otherSum <= 0) {
    const each = Math.floor(remaining / others.length);
    let assigned = 0;
    others.forEach((key, index) => {
      const value =
        index === others.length - 1 ? remaining - assigned : each;
      percent[key] = value;
      assigned += value;
    });
  } else {
    let assigned = 0;
    others.forEach((key, index) => {
      if (index === others.length - 1) {
        percent[key] = remaining - assigned;
      } else {
        const value = Math.round(remaining * (percent[key] / otherSum));
        percent[key] = value;
        assigned += value;
      }
    });
  }

  return Object.fromEntries(
    keys.map((key) => [key, percent[key] / 100]),
  ) as Record<CharacteristicName, number>;
}

export function SawPage() {
  const [weights, setWeights] =
    useState<Record<CharacteristicName, number>>(DEFAULT_WEIGHTS);
  const [position, setPosition] = useState<number | "all">("all");
  const [complexity, setComplexity] = useState<number | "all">("all");
  const [attackType, setAttackType] = useState<"all" | "Melee" | "Ranged">(
    "all",
  );
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["saw"],
    queryFn: () => apiGet<SawResponse>("/saw/rankings"),
  });

  const mutation = useMutation({
    mutationFn: (payload: Record<CharacteristicName, number>) =>
      apiPost<SawResponse>("/saw/calculate", payload),
    onSuccess: (data) => {
      queryClient.setQueryData(["saw"], data);
      if (data.sawRun?.weights) setWeights(data.sawRun.weights);
    },
  });

  useEffect(() => {
    if (query.data?.sawRun?.weights) {
      setWeights(query.data.sawRun.weights);
    }
  }, [query.data?.sawRun?.id]);

  const data = mutation.data ?? query.data;
  const results = data?.results ?? [];

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
      <h1 className="text-xl font-semibold">Recommendation</h1>
      <ScrollHint />

      {query.isPending ? <LoadingPanel label="recommendation ranking" /> : null}
      {query.isError ? (
        <ErrorPanel
          message={
            query.error instanceof Error ? query.error.message : "Unknown error"
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}

      <section className="mt-4" aria-labelledby="weights-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="weights-title" className="text-base font-semibold">
            Criteria weights
          </h2>
          <button
            type="button"
            className="button small"
            onClick={() => setWeights(DEFAULT_WEIGHTS)}
          >
            Reset 25%
          </button>
        </div>

        <div className="panel mt-2 grid gap-4 p-3 sm:grid-cols-2">
          {CHARACTERISTICS.map((characteristic) => (
            <label key={characteristic.key} className="block">
              <span className="flex items-baseline justify-between gap-2 text-sm">
                <span>{characteristic.label}</span>
                <span className="num text-stone-700">
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
                  setWeights((current) =>
                    redistributeWeights(current, characteristic.key, value),
                  );
                }}
              />
            </label>
          ))}
        </div>

        <div className="mt-2">
          <button
            type="button"
            className="button button-primary"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(weights)}
          >
            {mutation.isPending ? "Calculating..." : "Calculate ranking"}
          </button>
        </div>

        {mutation.isError ? (
          <p className="status error mt-3" role="alert">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Failed to calculate the ranking."}
          </p>
        ) : null}
      </section>

      <section className="mt-5" aria-labelledby="filter-title">
        <h2 id="filter-title" className="text-base font-semibold">
          Filters
        </h2>
        <div className="mt-2 flex flex-wrap gap-3">
          <label className="block">
            <span className="text-xs text-stone-600">Position</span>
            <select
              className="field mt-1 block min-w-40"
              value={position}
              onChange={(event) => {
                const value = event.target.value;
                setPosition(value === "all" ? "all" : Number(value));
              }}
            >
              <option value="all">All positions</option>
              {[1, 2, 3, 4, 5].map((item) => (
                <option key={item} value={item}>
                  Pos {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-stone-600">Complexity</span>
            <select
              className="field mt-1 block min-w-40"
              value={complexity}
              onChange={(event) => {
                const value = event.target.value;
                setComplexity(value === "all" ? "all" : Number(value));
              }}
            >
              <option value="all">All complexity</option>
              {[1, 2, 3].map((item) => (
                <option key={item} value={item}>
                  {item} ({COMPLEXITY_LABEL[item]})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-stone-600">Attack type</span>
            <select
              className="field mt-1 block min-w-40"
              value={attackType}
              onChange={(event) =>
                setAttackType(
                  event.target.value as "all" | "Melee" | "Ranged",
                )
              }
            >
              <option value="all">All types</option>
              <option value="Melee">Melee</option>
              <option value="Ranged">Ranged</option>
            </select>
          </label>
        </div>
      </section>

      {!query.isPending && results.length === 0 ? (
        <div className="mt-4">
          <EmptyPanel title="No recommendation ranking yet">
            Run <span className="num">npm run calculate</span>, then press
            Calculate ranking.
          </EmptyPanel>
        </div>
      ) : null}

      {results.length > 0 && filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyPanel title="No heroes match these filters">
            Change the position, complexity, or attack type.
          </EmptyPanel>
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <div className="scroll-x panel mt-4">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Hero</th>
                <th scope="col">Final score</th>
                <th scope="col">Pick rate</th>
                {CHARACTERISTICS.map((characteristic) => (
                  <th key={characteristic.key} scope="col">
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
                  <td className="num">{index + 1}</td>
                  <th scope="row">
                    <Link
                      className="font-medium text-accent underline underline-offset-2"
                      to={`/characteristics/${result.heroId}`}
                    >
                      {result.heroName}
                    </Link>
                    <span className="muted block text-xs">
                      Global #{result.rank}
                    </span>
                  </th>
                  <td className="num font-medium">
                    {formatDecimal(result.finalScore)}
                  </td>
                  <td className="num">
                    {formatPercent(result.pickRate)}
                    <span className="muted block text-xs">
                      {formatNumber(result.pickCount)} matches
                    </span>
                  </td>
                  {CHARACTERISTICS.map((characteristic) => (
                    <td key={characteristic.key} className="num">
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
