import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiGet, apiPost } from "../api/client";
import type {
  CcCoverageStatus,
  CcLabAbilityRegistry,
  CcLabConfig,
  CcLabResponse,
  CcSensitivityResponse,
} from "../api/types";
import { Badge, calculationTone } from "../components/Badge";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../components/StatePanel";
import { ScrollHint } from "../components/ScrollHint";
import { formatDecimal } from "../utils/format";

const COMPLEXITY_LABEL: Record<number, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
};

function statusTone(status: CcCoverageStatus) {
  if (status === "NOT_APPLICABLE") return "neutral" as const;
  return calculationTone(status);
}

function buildQuery(options: {
  useDebuffImmunity: boolean;
  assumeConditionMet: boolean;
  includeUnclassified: boolean;
  preset: string;
}): string {
  const params = new URLSearchParams({
    useDebuffImmunity: String(options.useDebuffImmunity),
    assumeConditionMet: String(options.assumeConditionMet),
    includeUnclassified: String(options.includeUnclassified),
  });
  if (options.preset !== "default") params.set("preset", options.preset);
  return params.toString();
}

export function CcLabPage() {
  const [useDebuffImmunity, setUseDebuffImmunity] = useState(false);
  const [assumeConditionMet, setAssumeConditionMet] = useState(true);
  const [includeUnclassified, setIncludeUnclassified] = useState(false);
  const [preset, setPreset] = useState("default");

  const queryString = buildQuery({
    useDebuffImmunity,
    assumeConditionMet,
    includeUnclassified,
    preset,
  });

  const configQuery = useQuery({
    queryKey: ["cc-lab-config"],
    queryFn: () => apiGet<CcLabConfig>("/cc-lab/config"),
  });

  const registryQuery = useQuery({
    queryKey: ["cc-lab-abilities"],
    queryFn: () => apiGet<CcLabAbilityRegistry>("/cc-lab/abilities"),
  });

  const query = useQuery({
    queryKey: ["cc-lab", queryString],
    queryFn: () => apiGet<CcLabResponse>(`/cc-lab/heroes?${queryString}`),
  });

  const sensitivity = useQuery({
    queryKey: [
      "cc-lab-sensitivity",
      useDebuffImmunity,
      assumeConditionMet,
    ],
    queryFn: () =>
      apiPost<CcSensitivityResponse>("/cc-lab/sensitivity", {
        useDebuffImmunity,
        assumeConditionMet,
      }),
  });

  const rankRows = useMemo(() => {
    const runs = sensitivity.data?.runs ?? [];
    const baseline = runs.find((run) => run.preset === "A");
    if (!baseline) return [];
    return baseline.rows.map((row) => ({
      heroId: row.heroId,
      heroName: row.heroName,
      ranks: runs.map((run) => ({
        preset: run.preset,
        rank:
          run.rows.find((item) => item.heroId === row.heroId)?.rank ?? null,
      })),
    }));
  }, [sensitivity.data?.runs]);

  return (
    <div>
      <div>
        <h1 className="text-xl font-semibold">CC Lab (eksperimen)</h1>
        <p className="muted mt-1 text-sm">
          Kalkulasi CC terpisah dari karakteristik utama dan SAW. Halaman ini
          menguji control strength, dispel, Debuff Immunity, conditional effect,
          dan overlap.
        </p>
        <Link
          className="mt-2 inline-block text-sm text-accent underline underline-offset-2"
          to="/cc-lab/audit"
        >
          Buka audit upgrade Aghanim (dikecualikan)
        </Link>
      </div>
      <ScrollHint />

      <div className="panel mt-3 border-amber-700 bg-amber-50 p-3 text-sm text-amber-900">
        <p className="font-medium">Tidak memengaruhi hasil SAW saat ini.</p>
        <p className="mt-1">
          Scope penelitian tanpa item. Aghanim&apos;s Scepter dan Shard
          dikecualikan, jadi hanya ability dasar yang dihitung.
        </p>
        <p className="mt-1">
          Eksperimen ini memakai registry efek manual untuk hero validasi.
          Sebagian ability belum terklasifikasi dan tidak dihitung.
        </p>
      </div>

      <section className="mt-4" aria-labelledby="cc-config-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="cc-config-title" className="text-base font-semibold">
            Skenario
          </h2>
          <span className="muted text-xs">
            Config {configQuery.data?.version ?? "-"} ·{" "}
            {configQuery.data?.registryCount ?? 0} efek terdaftar
          </span>
        </div>

        <div className="panel mt-2 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={assumeConditionMet}
              onChange={(event) => setAssumeConditionMet(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              Anggap kondisi terpenuhi
              <span className="muted block text-xs">
                Conditional tetap ditandai PARTIAL.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={useDebuffImmunity}
              disabled={preset !== "default"}
              onChange={(event) => setUseDebuffImmunity(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              Debuff Immunity multiplier
              <span className="muted block text-xs">
                {preset === "default"
                  ? "Default mati untuk target normal."
                  : "Diatur oleh preset."}
              </span>
            </span>
          </label>

          <label className="block text-sm">
            <span className="text-xs text-stone-600">Preset multiplier</span>
            <select
              className="field mt-1 block w-full"
              value={preset}
              onChange={(event) => setPreset(event.target.value)}
            >
              <option value="default">Default (multiplier A, tanpa Debuff Immunity)</option>
              <option value="A">A: konservatif</option>
              <option value="B">B: sedang</option>
              <option value="C">C: longgar</option>
              <option value="D">D: tanpa multiplier</option>
            </select>
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeUnclassified}
              onChange={(event) => setIncludeUnclassified(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              Tampilkan hero belum terklasifikasi
              <span className="muted block text-xs">
                Default hanya hero yang sudah terklasifikasi.
              </span>
            </span>
          </label>
        </div>
      </section>

      {query.isPending ? <LoadingPanel label="CC Lab" /> : null}
      {query.isError ? (
        <ErrorPanel
          message={
            query.error instanceof Error ? query.error.message : "Error tidak dikenal"
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.data ? (
        <section className="mt-5" aria-labelledby="cc-heroes-title">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="cc-heroes-title" className="text-base font-semibold">
              Hero
            </h2>
            <p className="muted text-xs">
              {query.data.summary.classified} terklasifikasi dari{" "}
              {query.data.summary.totalHeroes} hero. Ditampilkan{" "}
              {query.data.summary.returned}.
            </p>
          </div>

          {query.data.results.length === 0 ? (
            <div className="mt-2">
              <EmptyPanel title="Tidak ada hero">
                Ubah skenario atau tampilkan hero yang belum terklasifikasi.
              </EmptyPanel>
            </div>
          ) : (
            <div className="scroll-x panel mt-2">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Hero</th>
                    <th scope="col">CC total</th>
                    <th scope="col">Efek</th>
                    <th scope="col">Status</th>
                    <th scope="col">Complexity</th>
                    <th scope="col">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.results.map((result) => (
                    <tr key={result.heroId}>
                      <th scope="row">
                        <span className="font-medium">{result.heroName}</span>
                        <span className="muted block text-xs">
                          {result.primaryAttr}
                        </span>
                      </th>
                      <td className="num">{formatDecimal(result.totalCc)}</td>
                      <td className="num">
                        {result.effectCount}
                        {result.unsupportedCount > 0
                          ? ` (${result.unsupportedCount} partial)`
                          : ""}
                      </td>
                      <td>
                        <Badge tone={statusTone(result.status)}>
                          {result.status}
                        </Badge>
                      </td>
                      <td>
                        {result.complexity === null
                          ? "-"
                          : `${result.complexity} (${COMPLEXITY_LABEL[result.complexity] ?? "-"})`}
                      </td>
                      <td>
                        <Link
                          className="text-accent underline decoration-stone-400 underline-offset-2"
                          to={`/cc-lab/${result.heroId}`}
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      <section className="mt-6" aria-labelledby="cc-registry-title">
        <h2 id="cc-registry-title" className="text-base font-semibold">
          Registry efek CC
        </h2>
        <details className="panel mt-2">
          <summary className="cursor-pointer p-3 text-sm font-medium">
            {registryQuery.data
              ? `${registryQuery.data.registry.length} efek terdaftar, ${
                  registryQuery.data.registry.filter(
                    (entry) => (entry.upgradeType ?? "BASE") === "BASE",
                  ).length
                } aktif (BASE)`
              : "Memuat registry..."}
          </summary>
          {registryQuery.data ? (
            <div className="scroll-x border-t border-stone-200">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Hero / ability</th>
                    <th scope="col">Efek</th>
                    <th scope="col">Upgrade</th>
                    <th scope="col">Control</th>
                    <th scope="col">Dispel</th>
                    <th scope="col">Debuff Immunity</th>
                    <th scope="col">Conditional</th>
                  </tr>
                </thead>
                <tbody>
                  {registryQuery.data.registry.map((entry) => (
                    <tr key={entry.id}>
                      <th scope="row">
                        <span className="font-medium">
                          {entry.ability?.heroName ?? "-"}
                        </span>
                        <span className="muted block text-xs">
                          {entry.ability?.displayName ?? entry.abilityKey}
                        </span>
                      </th>
                      <td>{entry.effectName}</td>
                      <td>
                        <Badge
                          tone={
                            (entry.upgradeType ?? "BASE") === "BASE"
                              ? "neutral"
                              : "warn"
                          }
                        >
                          {entry.upgradeType ?? "BASE"}
                        </Badge>
                      </td>
                      <td>
                        <Badge tone="neutral">{entry.controlType}</Badge>
                      </td>
                      <td className="text-xs">{entry.dispelType}</td>
                      <td className="text-xs">{entry.debuffImmunity}</td>
                      <td className="text-xs">
                        {entry.isConditional
                          ? entry.conditionDescription ?? "Ya"
                          : "Tidak"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </details>
      </section>

      <section className="mt-6" aria-labelledby="cc-sensitivity-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="cc-sensitivity-title" className="text-base font-semibold">
            Sensitivity preset
          </h2>
          <p className="muted text-xs">
            Debuff Immunity {sensitivity.data?.scenario.useDebuffImmunityMultiplier ? "aktif" : "mati"}{" "}
            · baseline A
          </p>
        </div>

        {sensitivity.isPending ? (
          <div className="mt-2">
            <LoadingPanel label="sensitivitas CC" />
          </div>
        ) : null}
        {sensitivity.isError ? (
          <div className="mt-2">
            <ErrorPanel
              message={
                sensitivity.error instanceof Error
                  ? sensitivity.error.message
                  : "Error tidak dikenal"
              }
              onRetry={() => void sensitivity.refetch()}
            />
          </div>
        ) : null}

        {sensitivity.data ? (
          <>
            <div className="scroll-x panel mt-2">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Preset</th>
                    <th scope="col">Top-10 overlap</th>
                    <th scope="col">Rata-rata perubahan rank</th>
                    <th scope="col">Hero</th>
                  </tr>
                </thead>
                <tbody>
                  {sensitivity.data.summary.map((row) => (
                    <tr key={row.preset}>
                      <th scope="row">{row.label}</th>
                      <td className="num">
                        {formatDecimal(row.top10Overlap)}%
                      </td>
                      <td className="num">
                        {formatDecimal(row.averageAbsoluteRankChange)}
                      </td>
                      <td className="num">{row.heroCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="scroll-x panel mt-2">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Hero</th>
                    {sensitivity.data.runs.map((run) => (
                      <th key={run.preset} scope="col">
                        Rank {run.preset}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rankRows.map((row) => (
                    <tr key={row.heroId}>
                      <th scope="row">{row.heroName}</th>
                      {row.ranks.map((rank) => (
                        <td key={rank.preset} className="num">
                          {rank.rank ?? "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted mt-2 text-xs">
              {sensitivity.data.note}
            </p>
          </>
        ) : null}
      </section>
    </div>
  );
}
