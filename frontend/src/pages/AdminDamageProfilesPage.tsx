import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchAdminProfiles,
  fetchAdminSession,
  logoutAdmin,
  saveAdminProfile,
  saveAdminProfilesBulk,
} from "../api/admin";
import { ApiError, apiPost } from "../api/client";
import type {
  AdminDamageProfileRow,
  DamageSecondary,
  DamageType,
} from "../api/types";
import { Badge } from "../components/Badge";
import {
  EmptyPanel,
  ErrorPanel,
  LoadingPanel,
} from "../components/StatePanel";
import { ScrollHint } from "../components/ScrollHint";
import { formatDecimal, formatNumber } from "../utils/format";

const DAMAGE_TYPES: DamageType[] = ["PHYSICAL", "MAGICAL", "PURE"];
const SECONDARY_TYPES: DamageSecondary[] = [
  "PHYSICAL",
  "MAGICAL",
  "PURE",
  "NONE",
];

function typeLabel(type: DamageType | DamageSecondary): string {
  if (type === "NONE") return "None";
  if (type === "PHYSICAL") return "Physical";
  if (type === "MAGICAL") return "Magical";
  return "Pure";
}

interface Draft {
  main: DamageType;
  secondary: DamageSecondary;
  notes: string;
}

function draftOf(row: AdminDamageProfileRow): Draft {
  return {
    main: row.main ?? "PHYSICAL",
    secondary: row.secondary ?? "NONE",
    notes: row.notes ?? "",
  };
}

export function AdminDamageProfilesPage() {
  const [search, setSearch] = useState("");
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [status, setStatus] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [recalcState, setRecalcState] = useState<
    "idle" | "running" | "done" | "error"
  >("idle");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const session = useQuery({
    queryKey: ["admin-session"],
    queryFn: fetchAdminSession,
    retry: false,
  });

  const sessionStatus =
    session.error instanceof ApiError ? session.error.status : 0;
  useEffect(() => {
    if (session.isError && sessionStatus === 401) {
      navigate("/admin/login", { replace: true });
    }
  }, [session.isError, sessionStatus, navigate]);

  const profiles = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: fetchAdminProfiles,
    enabled: Boolean(session.data?.username),
  });

  const rows = profiles.data?.profiles ?? [];

  const effective = (row: AdminDamageProfileRow): Draft =>
    drafts[row.heroId] ?? draftOf(row);

  const isDirty = (row: AdminDamageProfileRow): boolean => {
    const draft = effective(row);
    return (
      draft.main !== (row.main ?? "PHYSICAL") ||
      draft.secondary !== (row.secondary ?? "NONE") ||
      draft.notes.trim() !== (row.notes ?? "").trim()
    );
  };

  const dirtyRows = rows.filter(isDirty);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (onlyEmpty && row.main !== null) return false;
      if (!needle) return true;
      return row.heroName.toLowerCase().includes(needle);
    });
  }, [rows, search, onlyEmpty]);

  const updateDraft = (row: AdminDamageProfileRow, patch: Partial<Draft>) => {
    setDrafts((current) => ({
      ...current,
      [row.heroId]: { ...effective(row), ...patch },
    }));
  };

  const saveOne = useMutation({
    mutationFn: async (row: AdminDamageProfileRow) => {
      const draft = effective(row);
      await saveAdminProfile(
        row.heroId,
        draft.main,
        draft.secondary,
        draft.notes,
      );
      return row;
    },
    onSuccess: async (row) => {
      setDrafts((current) => {
        const next = { ...current };
        delete next[row.heroId];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      setStatus({ kind: "ok", text: `${row.heroName} profile saved.` });
    },
    onError: (error) => {
      setStatus({
        kind: "error",
        text: error instanceof Error ? error.message : "Failed to save.",
      });
    },
  });

  const saveAll = useMutation({
    mutationFn: async () =>
      saveAdminProfilesBulk(
        dirtyRows.map((row) => {
          const draft = effective(row);
          return {
            heroId: row.heroId,
            main: draft.main,
            secondary: draft.secondary,
            notes: draft.notes,
          };
        }),
      ),
    onSuccess: async (result) => {
      setDrafts({});
      await queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      setStatus({
        kind: "ok",
        text: `${formatNumber(result.updated)} profiles saved.`,
      });
    },
    onError: (error) => {
      setStatus({
        kind: "error",
        text: error instanceof Error ? error.message : "Failed to save.",
      });
    },
  });

  const recalculation = useMutation({
    mutationFn: async () => {
      await apiPost("/characteristics/calculate", {});
      await apiPost("/saw/calculate", {});
    },
    onMutate: () => setRecalcState("running"),
    onSuccess: async () => {
      setRecalcState("done");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-profiles"] }),
        queryClient.invalidateQueries({ queryKey: ["saw"] }),
        queryClient.invalidateQueries({ queryKey: ["characteristics"] }),
      ]);
      setStatus({
        kind: "ok",
        text: "Characteristics and recommendation recalculated.",
      });
    },
    onError: (error) => {
      setRecalcState("error");
      setStatus({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to recalculate.",
      });
    },
  });

  if (session.isPending) return <LoadingPanel label="admin session" />;
  if (session.isError) {
    return (
      <div className="panel p-4">
        <p className="text-sm">Admin session is not active.</p>
        <Link
          className="mt-2 inline-block text-sm text-link underline underline-offset-2"
          to="/admin/login"
        >
          Go to login page
        </Link>
      </div>
    );
  }

  const emptyCount = rows.filter((row) => row.main === null).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-xl font-semibold">Hero damage profiles</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="muted">
            Signed in: <span className="font-medium">{session.data?.username}</span>
          </span>
          <button
            type="button"
            className="button"
            onClick={async () => {
              await logoutAdmin();
              await queryClient.invalidateQueries({ queryKey: ["admin-session"] });
              queryClient.removeQueries({ queryKey: ["admin-profiles"] });
              navigate("/admin/login", { replace: true });
            }}
          >
            Logout
          </button>
        </div>
      </div>
      <ScrollHint />

      <div className="panel mt-3 grid gap-3 p-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted">Heroes</p>
          <p className="num font-medium">{formatNumber(rows.length)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Unset</p>
          <p className="num font-medium">
            {formatNumber(emptyCount)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Unsaved changes</p>
          <p className="num font-medium">{formatNumber(dirtyRows.length)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-xs text-muted">Search hero</span>
          <input
            className="field mt-1 block min-w-56"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Example: Techies"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyEmpty}
            onChange={(event) => setOnlyEmpty(event.target.checked)}
          />
          Only unset
        </label>
        <button
          type="button"
          className="button"
          disabled={dirtyRows.length === 0 || saveAll.isPending}
          onClick={() => saveAll.mutate()}
        >
          {saveAll.isPending
            ? "Saving..."
            : `Save all (${formatNumber(dirtyRows.length)})`}
        </button>
        <button
          type="button"
          className="button"
          disabled={recalcState === "running"}
          onClick={() => recalculation.mutate()}
        >
          {recalcState === "running"
            ? "Calculating..."
            : "Recalculate characteristics and recommendation"}
        </button>
      </div>

      {status ? (
        <p
          className={
            status.kind === "ok" ? "status ok mt-3" : "status error mt-3"
          }
          role="status"
        >
          {status.text}
        </p>
      ) : null}

      {profiles.isPending ? <LoadingPanel label="damage profiles" /> : null}
      {profiles.isError ? (
        <ErrorPanel
          message={
            profiles.error instanceof Error
              ? profiles.error.message
              : "Failed to load profiles."
          }
          onRetry={() => void profiles.refetch()}
        />
      ) : null}

      {profiles.data ? (
        <>
          {filtered.length === 0 ? (
            <div className="mt-3">
              <EmptyPanel title="No heroes for this filter">
                Change the keyword or turn off the filter.
              </EmptyPanel>
            </div>
          ) : (
            <div className="scroll-x panel mt-3">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Hero</th>
                    <th scope="col">Physical</th>
                    <th scope="col">Magic</th>
                    <th scope="col">Pure</th>
                    <th scope="col">Main</th>
                    <th scope="col">Secondary</th>
                    <th scope="col">Notes</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const draft = effective(row);
                    const dirty = isDirty(row);
                    return (
                      <tr key={row.heroId}>
                        <th scope="row">
                          <span className="font-medium">{row.heroName}</span>
                          <span className="muted mt-1 block text-xs">
                            <Badge tone="neutral">{row.attackType}</Badge>
                            {dirty ? (
                              <Badge tone="warn">Unsaved</Badge>
                            ) : null}
                          </span>
                        </th>
                        <td className="num">
                          {formatDecimal(row.values.physical)}
                        </td>
                        <td className="num">
                          {formatDecimal(row.values.magic)}
                        </td>
                        <td className="num">
                          {formatDecimal(row.values.pure)}
                        </td>
                        <td>
                          <select
                            className="field"
                            aria-label={`Main damage ${row.heroName}`}
                            value={draft.main}
                            onChange={(event) => {
                              const main = event.target.value as DamageType;
                              const secondary =
                                draft.secondary === main
                                  ? "NONE"
                                  : draft.secondary;
                              updateDraft(row, { main, secondary });
                            }}
                          >
                            {DAMAGE_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {typeLabel(type)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="field"
                            aria-label={`Secondary damage ${row.heroName}`}
                            value={draft.secondary}
                            onChange={(event) =>
                              updateDraft(row, {
                                secondary: event.target
                                  .value as DamageSecondary,
                              })
                            }
                          >
                            {SECONDARY_TYPES.map((type) => (
                              <option
                                key={type}
                                value={type}
                                disabled={type === draft.main}
                              >
                                {typeLabel(type)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            className="field min-w-48"
                            type="text"
                            maxLength={500}
                            aria-label={`Notes for ${row.heroName}`}
                            value={draft.notes}
                            onChange={(event) =>
                              updateDraft(row, { notes: event.target.value })
                            }
                            placeholder="Optional"
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="button"
                            disabled={
                              !dirty ||
                              (saveOne.isPending &&
                                saveOne.variables?.heroId === row.heroId)
                            }
                            onClick={() => saveOne.mutate(row)}
                          >
                            {saveOne.isPending &&
                            saveOne.variables?.heroId === row.heroId
                              ? "..."
                              : "Save"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
