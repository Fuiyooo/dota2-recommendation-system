import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiGet } from "../api/client";
import type {
  CharacteristicName,
  CharacteristicsResponse,
} from "../api/types";
import { HeroThumb } from "../components/HeroThumb";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../components/StatePanel";
import { ScrollHint } from "../components/ScrollHint";
import { useHeroIndex } from "../hooks/useHeroIndex";
import { useHeroPositions } from "../hooks/useHeroPositions";
import { formatDecimal } from "../utils/format";

const ATTRIBUTE_ORDER = ["STR", "AGI", "INT", "UNIVERSAL"];

const CHARACTERISTICS: Array<{
  key: CharacteristicName;
  label: ReactNode;
}> = [
  { key: "damage", label: "Damage" },
  { key: "durability", label: "Durability" },
  { key: "crowdControl", label: "Crowd Control" },
  { key: "mobility", label: (<>Mobility /<br />Escape</>) },
];

function ScoreCell({ value }: { value: number | null }) {
  if (value === null) return <span className="muted">-</span>;
  return <span className="num font-medium">{formatDecimal(value)}</span>;
}

export function CharacteristicsPage() {
  const [search, setSearch] = useState("");
  const [attribute, setAttribute] = useState("all");
  const [position, setPosition] = useState<number | "all">("all");
  const [attackType, setAttackType] = useState("all");
  const heroIndex = useHeroIndex();
  const positions = useHeroPositions();

  const query = useQuery({
    queryKey: ["characteristics"],
    queryFn: () => apiGet<CharacteristicsResponse>("/characteristics/heroes"),
  });

  const items = query.data?.heroes ?? [];

  const attributes = useMemo(() => {
    const present = new Set(items.map((hero) => hero.primaryAttr));
    return ATTRIBUTE_ORDER.filter((value) => present.has(value));
  }, [items]);

  const attackTypes = useMemo(() => {
    const present = new Set(items.map((hero) => hero.attackType));
    return ["Melee", "Ranged"].filter((value) => present.has(value));
  }, [items]);

  const heroes = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return items.filter((hero) => {
      if (attribute !== "all" && hero.primaryAttr !== attribute) return false;
      if (position !== "all" && positions.get(hero.heroId) !== position) {
        return false;
      }
      if (attackType !== "all" && hero.attackType !== attackType) return false;
      if (!needle) return true;
      return hero.heroName.toLowerCase().includes(needle);
    });
  }, [items, search, attribute, position, attackType, positions]);

  const resetFilters = () => {
    setSearch("");
    setAttribute("all");
    setPosition("all");
    setAttackType("all");
  };

  return (
    <div>
      <h1 className="text-xl font-semibold">Karakteristik</h1>
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
          <EmptyPanel title="Belum ada hasil perhitungan">
            Jalankan <span className="num">npm run calculate</span> dari root
            project untuk menghitung seluruh hero.
          </EmptyPanel>
        </div>
      ) : null}

      {query.data?.run ? (
        <>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block w-full max-w-sm">
              <span className="text-xs text-muted">Cari hero</span>
              <input
                className="field mt-1 w-full"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nama hero"
              />
            </label>

            <label className="block">
              <span className="text-xs text-muted">Atribut</span>
              <select
                className="field mt-1 block min-w-36"
                value={attribute}
                onChange={(event) => setAttribute(event.target.value)}
              >
                <option value="all">Semua atribut</option>
                {attributes.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs text-muted">Posisi</span>
              <select
                className="field mt-1 block min-w-36"
                value={position}
                disabled={positions.size === 0}
                onChange={(event) => {
                  const value = event.target.value;
                  setPosition(value === "all" ? "all" : Number(value));
                }}
              >
                <option value="all">Semua posisi</option>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    Pos {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs text-muted">Tipe serangan</span>
              <select
                className="field mt-1 block min-w-36"
                value={attackType}
                onChange={(event) => setAttackType(event.target.value)}
              >
                <option value="all">Semua tipe</option>
                {attackTypes.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {heroes.length === 0 ? (
            <div className="mt-3">
              <EmptyPanel title="Tidak ada hero yang cocok">
                Ubah kata kunci atau filter.
                <button
                  type="button"
                  className="button mt-3 block"
                  onClick={resetFilters}
                >
                  Reset filter
                </button>
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
                        <div className="flex min-w-0 items-center gap-2">
                          <HeroThumb hero={heroIndex.get(hero.heroId)} />
                          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                            <Link
                              className="min-w-0 break-words text-link underline decoration-line-strong underline-offset-2"
                              to={`/characteristics/${hero.heroId}`}
                            >
                              {hero.heroName}
                            </Link>
                            <span className="muted text-xs">
                              {hero.primaryAttr} · {hero.attackType}
                            </span>
                          </div>
                        </div>
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
