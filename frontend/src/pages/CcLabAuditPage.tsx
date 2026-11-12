import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { API_BASE, apiGet, apiPost } from "../api/client";
import type { CcAuditResponse, CcImportResult } from "../api/types";
import { Badge } from "../components/Badge";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../components/StatePanel";
import { ScrollHint } from "../components/ScrollHint";
import { formatNumber } from "../utils/format";

const CATEGORY_LABEL: Record<string, string> = {
  NEW_GRANTED: "Ability baru",
  NEW_CC: "Tambah CC",
  MODIFY_CC: "Ubah CC",
  POSSIBLE: "Perlu review",
  NOT_CC: "Bukan CC",
};

const CATEGORY_TONE: Record<string, "accent" | "warn" | "ok" | "neutral" | "danger"> = {
  NEW_GRANTED: "accent",
  NEW_CC: "accent",
  MODIFY_CC: "warn",
  POSSIBLE: "danger",
  NOT_CC: "neutral",
};

export function CcLabAuditPage() {
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [registered, setRegistered] = useState("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [importErrors, setImportErrors] = useState<
    Array<{ row: number; message: string }>
  >([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["cc-lab-audit"],
    queryFn: () => apiGet<CcAuditResponse>("/cc-lab/audit"),
  });

  const rows = useMemo(() => {
    const items = query.data?.rows ?? [];
    const needle = search.trim().toLowerCase();
    return items.filter((row) => {
      if (type !== "all" && row.upgradeType !== type) return false;
      if (category !== "all" && row.category !== category) return false;
      if (registered === "yes" && !row.registered) return false;
      if (registered === "no" && row.registered) return false;
      if (
        needle &&
        !row.heroName.toLowerCase().includes(needle) &&
        !row.displayName.toLowerCase().includes(needle) &&
        !row.abilityKey.toLowerCase().includes(needle)
      ) {
        return false;
      }
      return true;
    });
  }, [query.data?.rows, type, category, registered, search]);

  return (
    <div>
      <Link className="text-sm text-accent underline underline-offset-2" to="/cc-lab">
        Kembali ke CC Lab
      </Link>
      <div className="mt-3">
        <h1 className="text-xl font-semibold">Audit upgrade Aghanim</h1>
        <p className="muted mt-1 text-sm">
          Pemindaian otomatis seluruh upgrade Scepter dan Shard. Semua baris
          di sini berstatus dikecualikan karena scope penelitian tanpa item.
          Kategori otomatis adalah kandidat, bukan klasifikasi final.
        </p>
      </div>
      <ScrollHint />

      <div className="panel mt-3 p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="button"
            onClick={async () => {
              try {
                const response = await fetch(
                  `${API_BASE}/cc-lab/verification/export`,
                );
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "cc-verification.csv";
                document.body.append(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
                setStatus({ kind: "ok", text: "CSV verifikasi diunduh." });
              } catch {
                setStatus({
                  kind: "error",
                  text: "Gagal mengunduh CSV.",
                });
              }
            }}
          >
            Unduh CSV verifikasi
          </button>
          <button
            type="button"
            className="button"
            onClick={() => fileRef.current?.click()}
          >
            Impor CSV
          </button>
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            accept=".csv,text/csv"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              try {
                const csv = await file.text();
                const result = await apiPost<CcImportResult>(
                  "/cc-lab/verification/import",
                  { csv },
                );
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ["cc-lab-audit"] }),
                  queryClient.invalidateQueries({ queryKey: ["cc-lab"] }),
                  queryClient.invalidateQueries({ queryKey: ["cc-lab-sens"] }),
                  queryClient.invalidateQueries({ queryKey: ["cc-lab-hero"] }),
                  queryClient.invalidateQueries({ queryKey: ["cc-lab-config"] }),
                  queryClient.invalidateQueries({ queryKey: ["cc-lab-abilities"] }),
                ]);
                setImportErrors(result.errors);
                setStatus({
                  kind: "ok",
                  text: `CSV diimpor: ${result.imported} baris, ${result.excluded} dikecualikan, ${result.skipped} dilewati, ${result.errors.length} error.`,
                });
              } catch (error) {
                setStatus({
                  kind: "error",
                  text: error instanceof Error ? error.message : "Gagal impor CSV.",
                });
              }
            }}
          />
        </div>
        {status ? (
          <p
            className={status.kind === "ok" ? "status ok mt-2" : "status error mt-2"}
            role="status"
          >
            {status.text}
          </p>
        ) : null}
        {importErrors.length > 0 ? (
          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-red-800">
              Lihat {importErrors.length} error impor
            </summary>
            <ul className="mt-1 list-disc pl-5 text-xs text-red-800">
              {importErrors.map((error) => (
                <li key={`${error.row}-${error.message}`}>
                  Baris {error.row}: {error.message}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        <details className="mt-2">
          <summary className="cursor-pointer text-accent">
            Cara mengisi CSV
          </summary>
          <ul className="muted mt-2 list-disc space-y-1 pl-5 text-xs">
            <li>
              Isi <span className="num">controlType</span>,{" "}
              <span className="num">durationField</span> atau{" "}
              <span className="num">durationFixed</span>,{" "}
              <span className="num">dispelType</span>, dan{" "}
              <span className="num">debuffImmunity</span>.
            </li>
            <li>
              Set <span className="num">verified</span> ke{" "}
              <span className="num">TRUE</span> agar baris BASE dipakai
              calculator.
            </li>
            <li>
              Baris <span className="num">SCEPTER</span> dan{" "}
              <span className="num">SHARD</span> selalu disimpan sebagai
              dokumentasi dan tidak pernah aktif.
            </li>
            <li>
              Satu ability boleh punya beberapa baris efek. Bedakan{" "}
              <span className="num">effectName</span>.
            </li>
            <li>
              Biarkan <span className="num">controlType</span> kosong jika
              kandidat belum siap diverifikasi.
            </li>
          </ul>
        </details>
      </div>

      {query.isPending ? <LoadingPanel label="audit upgrade" /> : null}
      {query.isError ? (
        <ErrorPanel
          message={
            query.error instanceof Error ? query.error.message : "Error tidak dikenal"
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.data ? (
        <>
          <div className="panel mt-4 grid gap-3 p-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <p className="text-xs text-stone-600">Total upgrade</p>
              <p className="num font-medium">
                {formatNumber(query.data.summary.totalUpgrades)}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-600">Scepter / Shard</p>
              <p className="num font-medium">
                {formatNumber(query.data.summary.scepter)} /{" "}
                {formatNumber(query.data.summary.shard)}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-600">Dikecualikan</p>
              <p className="num font-medium text-amber-900">
                {formatNumber(query.data.summary.excludedByScope)}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-600">Terdaftar di registry</p>
              <p className="num font-medium">
                {formatNumber(query.data.summary.registered)}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-600">Kandidat CC</p>
              <p className="num font-medium">
                {formatNumber(
                  query.data.summary.newGranted +
                    query.data.summary.newCc +
                    query.data.summary.modifyCc +
                    query.data.summary.possible,
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-600">Belum terdaftar</p>
              <p className="num font-medium text-accent">
                {formatNumber(query.data.summary.unregisteredCcCandidates)}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            <label className="block">
              <span className="text-xs text-stone-600">Upgrade</span>
              <select
                className="field mt-1 block min-w-36"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                <option value="all">Semua</option>
                <option value="SCEPTER">Scepter</option>
                <option value="SHARD">Shard</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-stone-600">Kategori</span>
              <select
                className="field mt-1 block min-w-44"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="all">Semua</option>
                <option value="NEW_GRANTED">Ability baru</option>
                <option value="NEW_CC">Tambah CC</option>
                <option value="MODIFY_CC">Ubah CC</option>
                <option value="POSSIBLE">Perlu review</option>
                <option value="NOT_CC">Bukan CC</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-stone-600">Registry</span>
              <select
                className="field mt-1 block min-w-36"
                value={registered}
                onChange={(event) => setRegistered(event.target.value)}
              >
                <option value="all">Semua</option>
                <option value="yes">Terdaftar</option>
                <option value="no">Belum terdaftar</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-stone-600">Cari hero atau ability</span>
              <input
                className="field mt-1 block min-w-56"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Contoh: Magnus, stun, silence"
              />
            </label>
          </div>

          <p className="muted mt-2 text-xs">
            Menampilkan {rows.length} dari {query.data.summary.totalUpgrades}{" "}
            upgrade.
          </p>

          {rows.length === 0 ? (
            <div className="mt-2">
              <EmptyPanel title="Tidak ada upgrade untuk filter ini">
                Ubah filter atau kata kunci.
              </EmptyPanel>
            </div>
          ) : (
            <div className="scroll-x panel mt-2">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Hero / ability</th>
                    <th scope="col">Upgrade</th>
                    <th scope="col">Kategori</th>
                    <th scope="col">Granted</th>
                    <th scope="col">Perubahan CC</th>
                    <th scope="col">Registry</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <th scope="row">
                        <span className="font-medium">{row.heroName}</span>
                        <span className="muted block text-xs">
                          {row.displayName}
                        </span>
                        <span className="muted num block text-xs">
                          {row.abilityKey}
                        </span>
                      </th>
                      <td>
                        <Badge tone="neutral">{row.upgradeType}</Badge>
                        <span className="muted mt-1 block text-xs">
                          Dikecualikan
                        </span>
                      </td>
                      <td>
                        <Badge tone={CATEGORY_TONE[row.category] ?? "neutral"}>
                          {CATEGORY_LABEL[row.category] ?? row.category}
                        </Badge>
                      </td>
                      <td className="text-xs">
                        {row.granted ? "Ability baru" : row.hasFlag ? "Upgrade" : "-"}
                      </td>
                      <td className="text-xs">
                        {row.upgradeText ? (
                          <span>{row.upgradeText}</span>
                        ) : null}
                        {row.changedCcFields.length > 0 ? (
                          <span className="muted num mt-1 block">
                            {row.changedCcFields.join(", ")}
                          </span>
                        ) : null}
                        {!row.upgradeText && row.changedCcFields.length === 0
                          ? "-"
                          : null}
                      </td>
                      <td>
                        <Badge tone={row.registered ? "ok" : "warn"}>
                          {row.registered ? "Terdaftar" : "Belum"}
                        </Badge>
                        {row.registeredEffects.length > 0 ? (
                          <span className="muted num mt-1 block text-xs">
                            {row.registeredEffects.join(", ")}
                          </span>
                        ) : null}
                      </td>
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
