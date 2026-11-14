import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiGet } from "../api/client";
import type { HeroSummary } from "../api/types";
import { GameImage } from "../components/GameImage";
import { HERO_THUMB_HEIGHT, HERO_THUMB_WIDTH } from "../components/HeroThumb";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../components/StatePanel";
import { ScrollHint } from "../components/ScrollHint";
import { useHeroPositions } from "../hooks/useHeroPositions";
import { formatDecimal } from "../utils/format";
import { heroPortraitUrl } from "../utils/dotaAssets";

const ATTRIBUTE_ORDER = ["STR", "AGI", "INT", "UNIVERSAL"];

export function HeroListPage() {
  const [search, setSearch] = useState("");
  const [attribute, setAttribute] = useState("all");
  const [position, setPosition] = useState<number | "all">("all");
  const [attackType, setAttackType] = useState("all");
  const positions = useHeroPositions();

  const query = useQuery({
    queryKey: ["heroes"],
    queryFn: () => apiGet<HeroSummary[]>("/heroes"),
  });

  const attributes = useMemo(() => {
    const present = new Set((query.data ?? []).map((hero) => hero.primaryAttr));
    return ATTRIBUTE_ORDER.filter((value) => present.has(value));
  }, [query.data]);

  const attackTypes = useMemo(() => {
    const present = new Set((query.data ?? []).map((hero) => hero.attackType));
    return ["Melee", "Ranged"].filter((value) => present.has(value));
  }, [query.data]);

  const heroes = useMemo(() => {
    const items = query.data ?? [];
    const needle = search.trim().toLowerCase();

    return items.filter((hero) => {
      if (attribute !== "all" && hero.primaryAttr !== attribute) return false;
      if (position !== "all" && positions.get(hero.id) !== position) return false;
      if (attackType !== "all" && hero.attackType !== attackType) return false;
      if (!needle) return true;
      return (
        hero.localizedName.toLowerCase().includes(needle) ||
        hero.primaryAttr.toLowerCase().includes(needle) ||
        hero.attackType.toLowerCase().includes(needle) ||
        hero.roles.some((role) => role.toLowerCase().includes(needle))
      );
    });
  }, [query.data, search, attribute, position, attackType, positions]);

  const resetFilters = () => {
    setSearch("");
    setAttribute("all");
    setPosition("all");
    setAttackType("all");
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold">Hero</h1>
        <p className="muted text-sm">
          {query.data ? `${query.data.length} hero` : "Menunggu data"}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block w-full max-w-sm">
          <span className="text-xs text-muted">Cari</span>
          <input
            className="field mt-1 w-full"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Contoh: Lina, INT, Support"
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
      <ScrollHint />

      <div className="mt-4">
        {query.isPending ? <LoadingPanel label="daftar hero" /> : null}
        {query.isError ? (
          <ErrorPanel
            message={
              query.error instanceof Error ? query.error.message : "Error tidak dikenal"
            }
            onRetry={() => void query.refetch()}
          />
        ) : null}
        {query.isSuccess && query.data.length === 0 ? (
          <EmptyPanel title="Belum ada data hero">
            Jalankan <span className="num">npm run sync:constants</span> dari root
            project, lalu muat ulang halaman ini.
          </EmptyPanel>
        ) : null}
        {query.isSuccess && query.data.length > 0 && heroes.length === 0 ? (
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
        ) : null}
        {heroes.length > 0 ? (
          <div className="scroll-x panel">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Hero</th>
                  <th scope="col">Attribute</th>
                  <th scope="col">Attack Type</th>
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
                        className="flex min-w-0 items-center gap-2 text-link"
                        to={`/heroes/${hero.id}`}
                      >
                        <GameImage
                          src={heroPortraitUrl(hero.name)}
                          width={HERO_THUMB_WIDTH}
                          height={HERO_THUMB_HEIGHT}
                        />
                        <span className="break-words underline decoration-line-strong underline-offset-2">
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
