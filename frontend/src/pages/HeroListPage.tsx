import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiGet } from "../api/client";
import type { HeroSummary } from "../api/types";
import { GameImage } from "../components/GameImage";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../components/StatePanel";
import { ScrollHint } from "../components/ScrollHint";
import { formatDecimal } from "../utils/format";
import { heroPortraitUrl } from "../utils/dotaAssets";

export function HeroListPage() {
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["heroes"],
    queryFn: () => apiGet<HeroSummary[]>("/heroes"),
  });

  const heroes = useMemo(() => {
    const items = query.data ?? [];
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (hero) =>
        hero.localizedName.toLowerCase().includes(needle) ||
        hero.primaryAttr.toLowerCase().includes(needle) ||
        hero.attackType.toLowerCase().includes(needle) ||
        hero.roles.some((role) => role.toLowerCase().includes(needle)),
    );
  }, [query.data, search]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold">Heroes</h1>
        <p className="muted text-sm">
          {query.data ? `${query.data.length} heroes` : "Waiting for data"}
        </p>
      </div>

      <label className="mt-4 block max-w-sm">
        <span className="text-xs text-muted">Search</span>
        <input
          className="field mt-1 w-full"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Example: Lina, INT, Support"
        />
      </label>
      <ScrollHint />

      <div className="mt-4">
        {query.isPending ? <LoadingPanel label="hero list" /> : null}
        {query.isError ? (
          <ErrorPanel
            message={
              query.error instanceof Error ? query.error.message : "Unknown error"
            }
            onRetry={() => void query.refetch()}
          />
        ) : null}
        {query.isSuccess && query.data.length === 0 ? (
          <EmptyPanel title="No hero data yet">
            Run <span className="num">npm run sync:constants</span> from the
            project root, then reload this page.
          </EmptyPanel>
        ) : null}
        {query.isSuccess && query.data.length > 0 && heroes.length === 0 ? (
          <EmptyPanel title="No matching heroes">
            Clear the keyword or try another attribute.
            <button
              type="button"
              className="button mt-3 block"
              onClick={() => setSearch("")}
            >
              Reset search
            </button>
          </EmptyPanel>
        ) : null}
        {heroes.length > 0 ? (
          <div className="scroll-x panel">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Hero</th>
                  <th scope="col">Attribute</th>
                  <th scope="col">Attack</th>
                  <th scope="col">Role</th>
                  <th scope="col">Complexity</th>
                  <th scope="col">Armor</th>
                </tr>
              </thead>
              <tbody>
                {heroes.map((hero) => (
                  <tr key={hero.id}>
                    <th scope="row">
                      <Link
                        className="flex items-center gap-2 text-link"
                        to={`/heroes/${hero.id}`}
                      >
                        <GameImage
                          src={heroPortraitUrl(hero.name)}
                          width={64}
                          height={36}
                        />
                        <span className="underline decoration-line-strong underline-offset-2">
                          {hero.localizedName}
                        </span>
                      </Link>
                    </th>
                    <td>{hero.primaryAttr}</td>
                    <td>{hero.attackType}</td>
                    <td className="muted">{hero.roles.join(", ") || "-"}</td>
                    <td className="num">{hero.complexity ?? "-"}</td>
                    <td className="num">{formatDecimal(hero.armor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
