import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiGet } from "../api/client";
import type { HeroSummary } from "../api/types";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../components/StatePanel";
import { ScrollHint } from "../components/ScrollHint";
import { formatDecimal } from "../utils/format";

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
        <div>
          <h1 className="text-xl font-semibold">Hero</h1>
          <p className="muted mt-1 text-sm">
            Data hero dari Valve Datafeed. Atribut dan growth adalah nilai dasar,
            bukan hasil perhitungan karakteristik.
          </p>
        </div>
        <p className="text-sm muted">
          {query.data ? `${query.data.length} hero` : "Menunggu data"}
        </p>
      </div>

      <label className="mt-4 block max-w-sm">
        <span className="text-xs text-stone-600">Cari hero, atribut, atau role</span>
        <input
          className="field mt-1 w-full"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Contoh: Lina, INT, Support"
        />
      </label>
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
            Hapus kata kunci atau coba atribut lain.
            <button
              type="button"
              className="button mt-3 block"
              onClick={() => setSearch("")}
            >
              Reset pencarian
            </button>
          </EmptyPanel>
        ) : null}
        {heroes.length > 0 ? (
          <div className="scroll-x panel">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Hero</th>
                  <th scope="col">Atribut</th>
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
                        className="text-accent underline decoration-stone-400 underline-offset-2"
                        to={`/heroes/${hero.id}`}
                      >
                        {hero.localizedName}
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
