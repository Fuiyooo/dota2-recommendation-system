import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiGet } from "../api/client";
import type { CalculationStatusResponse, DataStatus } from "../api/types";
import { Badge, runTone, validationTone } from "../components/Badge";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../components/StatePanel";
import { ScrollHint } from "../components/ScrollHint";
import { formatDate, formatNumber } from "../utils/format";

export function DataStatusPage() {
  const query = useQuery({
    queryKey: ["data-status"],
    queryFn: () => apiGet<DataStatus>("/data/status"),
  });
  const calculation = useQuery({
    queryKey: ["calculation-status"],
    queryFn: () =>
      apiGet<CalculationStatusResponse>("/calculation/status"),
  });

  if (query.isPending) return <LoadingPanel label="status data" />;
  if (query.isError) {
    return (
      <ErrorPanel
        message={
          query.error instanceof Error ? query.error.message : "Error tidak dikenal"
        }
        onRetry={() => void query.refetch()}
      />
    );
  }

  const data = query.data;

  return (
    <div>
      <div>
        <h1 className="text-xl font-semibold">Status data</h1>
        <p className="muted mt-1 text-sm">
          Ringkasan sumber, sinkronisasi, snapshot meta, dan hasil validasi patch.
        </p>
      </div>
      <ScrollHint />

      <section className="mt-5" aria-labelledby="patch-title">
        <h2 id="patch-title" className="text-base font-semibold">
          Patch target
        </h2>
        <div className="panel mt-2 grid gap-3 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted">Patch</p>
            <p className="num font-medium">{data.targetPatch}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Status</p>
            <p>
              <Badge tone={data.patch.verified ? "ok" : "warn"}>
                {data.patch.verified ? "Patch tercatat" : "Belum tercatat"}
              </Badge>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Revisi sumber</p>
            <p className="num">{data.patch.sourceRevision ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Diambil</p>
            <p className="num">{formatDate(data.patch.fetchedAt)}</p>
          </div>
        </div>
        <div className="panel mt-2 grid gap-3 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted">Hero</p>
            <p className="num font-medium">{formatNumber(data.counts.heroes)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Ability</p>
            <p className="num font-medium">{formatNumber(data.counts.abilities)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Talent</p>
            <p className="num font-medium">{formatNumber(data.counts.talents)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Baris meta</p>
            <p className="num font-medium">
              {formatNumber(data.counts.metaStats)}
            </p>
          </div>
        </div>
        <p className="muted mt-2 text-xs">
          Status patch menandakan catatan patch 7.41f sudah tersedia. Hasil
          pemeriksaan field ada di bagian Validasi patch.
        </p>
      </section>

      <section className="mt-6" aria-labelledby="snapshot-title">
        <h2 id="snapshot-title" className="text-base font-semibold">
          Snapshot meta
        </h2>
        {data.snapshot ? (
          <div className="panel mt-2 grid gap-3 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted">Patch</p>
              <p className="num font-medium">{data.snapshot.patch}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Bracket</p>
              <p className="font-medium">{data.snapshot.bracket}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Week</p>
              <p className="num font-medium">{data.snapshot.week}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Dibuat</p>
              <p className="num font-medium">
                {formatDate(data.snapshot.capturedAt)}
              </p>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="text-xs text-muted">Baris statistik</p>
              <p className="num font-medium">
                {formatNumber(data.snapshot._count?.stats ?? 0)}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <EmptyPanel title="Belum ada snapshot">
              Jalankan <span className="num">npm run sync:meta</span> untuk
              membuat satu snapshot Immortal.
            </EmptyPanel>
          </div>
        )}
      </section>

      <section className="mt-6" aria-labelledby="calculation-title">
        <h2 id="calculation-title" className="text-base font-semibold">
          Kalkulasi karakteristik
        </h2>
        {calculation.isPending ? (
          <div className="mt-2">
            <LoadingPanel label="status kalkulasi" />
          </div>
        ) : null}
        {calculation.isError ? (
          <div className="mt-2">
            <ErrorPanel
              message={
                calculation.error instanceof Error
                  ? calculation.error.message
                  : "Error tidak dikenal"
              }
              onRetry={() => void calculation.refetch()}
            />
          </div>
        ) : null}
        {calculation.data && !calculation.data.run ? (
          <div className="mt-2">
            <EmptyPanel title="Belum ada kalkulasi karakteristik">
              Jalankan <span className="num">npm run calculate</span> dari root
              project.
            </EmptyPanel>
          </div>
        ) : null}
        {calculation.data?.run ? (
          <>
            <div className="panel mt-2 grid gap-3 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted">Run</p>
                <p className="num font-medium">#{calculation.data.run.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Status</p>
                <Badge tone={runTone(calculation.data.run.status)}>
                  {calculation.data.run.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted">Config</p>
                <p className="num font-medium">
                  {calculation.data.configVersion ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Selesai</p>
                <p className="num font-medium">
                  {formatDate(calculation.data.run.finishedAt)}
                </p>
              </div>
            </div>
            <div className="panel mt-2 grid gap-3 p-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted">Indikator mentah</p>
                <p className="num font-medium">
                  {formatNumber(calculation.data.counts?.indicators ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Skor indikator</p>
                <p className="num font-medium">
                  {formatNumber(calculation.data.counts?.scores ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Skor karakteristik</p>
                <p className="num font-medium">
                  {formatNumber(calculation.data.counts?.characteristics ?? 0)}
                </p>
              </div>
            </div>
            <p className="muted mt-2 text-xs">
              {calculation.data.run.note ?? "Tidak ada catatan."}{" "}
              <Link
                className="text-link underline underline-offset-2"
                to="/characteristics"
              >
                Buka skor karakteristik
              </Link>
            </p>
          </>
        ) : null}
      </section>

      <section className="mt-6" aria-labelledby="sources-title">
        <h2 id="sources-title" className="text-base font-semibold">
          Sumber data
        </h2>        {data.sources.length === 0 ? (
          <div className="mt-2">
            <EmptyPanel title="Belum ada sumber tercatat">
              Jalankan sync constants terlebih dahulu.
            </EmptyPanel>
          </div>
        ) : (
          <div className="scroll-x panel mt-2">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Sumber</th>
                  <th scope="col">Versi</th>
                  <th scope="col">Revisi</th>
                  <th scope="col">Status</th>
                  <th scope="col">Diambil</th>
                  <th scope="col">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.map((source) => (
                  <tr key={source.id}>
                    <th scope="row" className="num text-xs">
                      {source.sourceName}
                    </th>
                    <td className="num">{source.gameVersion}</td>
                    <td className="num text-xs">{source.sourceRevision}</td>
                    <td>
                      <Badge tone={validationTone(source.validationStatus)}>
                        {source.validationStatus}
                      </Badge>
                    </td>
                    <td className="num text-xs">{formatDate(source.fetchedAt)}</td>
                    <td className="muted text-xs">{source.notes ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6" aria-labelledby="sync-title">
        <h2 id="sync-title" className="text-base font-semibold">
          Riwayat sinkronisasi
        </h2>
        {data.syncRuns.length === 0 ? (
          <div className="mt-2">
            <EmptyPanel title="Belum ada sinkronisasi">
              Jalankan sync constants atau sync meta dari root project.
            </EmptyPanel>
          </div>
        ) : (
          <div className="scroll-x panel mt-2">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Sumber</th>
                  <th scope="col">Status</th>
                  <th scope="col">Mulai</th>
                  <th scope="col">Selesai</th>
                  <th scope="col">Jumlah</th>
                  <th scope="col">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {data.syncRuns.map((run) => (
                  <tr key={run.id}>
                    <th scope="row" className="num text-xs">
                      {run.source}
                    </th>
                    <td>
                      <Badge tone={runTone(run.status)}>{run.status}</Badge>
                    </td>
                    <td className="num text-xs">{formatDate(run.startedAt)}</td>
                    <td className="num text-xs">{formatDate(run.finishedAt)}</td>
                    <td className="num text-xs">
                      {run.source === "META"
                        ? `${run.heroCount} hero`
                        : `${run.heroCount} hero, ${run.abilityCount} ability`}
                    </td>
                    <td className="muted text-xs">{run.note ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6" aria-labelledby="validation-title">
        <h2 id="validation-title" className="text-base font-semibold">
          Catatan patch Valve
        </h2>
        <div className="panel mt-2 grid gap-3 p-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted">Total catatan</p>
            <p className="num font-medium">
              {formatNumber(data.validation.totalChanges)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Patch</p>
            <p className="num font-medium">{data.targetPatch}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Sumber</p>
            <p className="font-medium">Valve Datafeed</p>
          </div>
        </div>
        <p className="muted mt-2 text-xs">
          Catatan diambil langsung dari Valve Datafeed untuk patch{" "}
          {data.targetPatch}. Status ability mengikuti data Valve apa adanya.
        </p>

        {data.validation.recent.length === 0 ? (
          <div className="mt-2">
            <EmptyPanel title="Belum ada catatan validasi">
              Jalankan <span className="num">npm run sync:patch</span>.
            </EmptyPanel>
          </div>
        ) : (
          <div className="scroll-x panel mt-2">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Hero / ability</th>
                  <th scope="col">Jenis</th>
                  <th scope="col">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {data.validation.recent.map((change) => (
                  <tr key={change.id}>
                    <th scope="row">
                      {change.hero?.localizedName ?? "-"}
                      <span className="muted num block text-xs">
                        {change.ability?.displayName ??
                          change.ability?.abilityKey ??
                          change.kind}
                      </span>
                    </th>
                    <td className="num text-xs">{change.kind}</td>
                    <td className="text-xs">{change.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
