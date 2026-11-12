import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiGet } from "../api/client";
import type {
  CharacteristicName,
  CharacteristicsResponse,
} from "../api/types";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../components/StatePanel";
import { ScrollHint } from "../components/ScrollHint";
import { formatDecimal } from "../utils/format";

const CHARACTERISTICS: Array<{
  key: CharacteristicName;
  label: string;
}> = [
  { key: "damage", label: "Damage" },
  { key: "durability", label: "Durability" },
  { key: "crowdControl", label: "Crowd Control" },
  { key: "mobility", label: "Mobility / Escape" },
];

function ScoreCell({ value }: { value: number | null }) {
  if (value === null) return <span className="muted">-</span>;
  return <span className="num font-medium">{formatDecimal(value)}</span>;
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
      <h1 className="text-xl font-semibold">Characteristics</h1>
      <ScrollHint />

      {query.isPending ? <LoadingPanel label="characteristic scores" /> : null}
      {query.isError ? (
        <ErrorPanel
          message={
            query.error instanceof Error ? query.error.message : "Unknown error"
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.isSuccess && !query.data.run ? (
        <div className="mt-4">
          <EmptyPanel title="No calculation results yet">
            Run <span className="num">npm run calculate</span> from the project
            root to score every hero.
          </EmptyPanel>
        </div>
      ) : null}

      {query.data?.run ? (
        <>
          <label className="mt-4 block max-w-sm">
            <span className="text-xs text-stone-600">Search hero</span>
            <input
              className="field mt-1 w-full"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Hero name"
            />
          </label>

          {heroes.length === 0 ? (
            <div className="mt-3">
              <EmptyPanel title="No matching heroes">
                Clear the search keyword.
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
                              <ScoreCell value={score.score} />
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
