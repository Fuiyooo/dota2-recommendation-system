import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchAdminCcAbilities,
  fetchAdminSession,
  logoutAdmin,
  saveAdminCcAbilitiesBulk,
  saveAdminCcAbility,
} from "../api/admin";
import { ApiError, apiPost } from "../api/client";
import type {
  AdminCcAbilityRow,
  AdminCcDispel,
  AdminCcPierce,
} from "../api/types";
import { Badge } from "../components/Badge";
import {
  EmptyPanel,
  ErrorPanel,
  LoadingPanel,
} from "../components/StatePanel";
import { ScrollHint } from "../components/ScrollHint";
import { formatDecimal, formatNumber } from "../utils/format";

const DISPEL_OPTIONS: Array<{ value: AdminCcDispel; label: string }> = [
  { value: "STRONG", label: "Strong dispel" },
  { value: "BASIC", label: "Basic dispel" },
  { value: "UNDISPELLABLE", label: "Undispellable" },
  { value: "UNKNOWN", label: "Unknown" },
];

const PIERCE_OPTIONS: Array<{ value: AdminCcPierce; label: string }> = [
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
  { value: "UNKNOWN", label: "Unknown" },
];

function dispelLabel(value: AdminCcDispel): string {
  return DISPEL_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function pierceLabel(value: AdminCcPierce): string {
  return PIERCE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

interface Draft {
  dispelType: AdminCcDispel;
  piercesImmunity: AdminCcPierce;
}

function draftOf(row: AdminCcAbilityRow): Draft {
  return {
    dispelType: row.dispelType,
    piercesImmunity: row.piercesImmunity,
  };
}

export function AdminCcAbilitiesPage() {
  const [search, setSearch] = useState("");
  const [onlyHard, setOnlyHard] = useState(true);
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

  const abilities = useQuery({
    queryKey: ["admin-cc-abilities"],
    queryFn: fetchAdminCcAbilities,
    enabled: Boolean(session.data?.username),
  });

  const rows = abilities.data?.abilities ?? [];

  const effective = (row: AdminCcAbilityRow): Draft =>
    drafts[row.abilityId] ?? draftOf(row);

  const isDirty = (row: AdminCcAbilityRow): boolean => {
    const draft = effective(row);
    return (
      draft.dispelType !== row.dispelType ||
      draft.piercesImmunity !== row.piercesImmunity
    );
  };

  const dirtyRows = rows.filter(isDirty);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (onlyHard && row.controlType !== "HARD") return false;
      if (!needle) return true;
      return (
        row.heroName.toLowerCase().includes(needle) ||
        row.abilityName.toLowerCase().includes(needle)
      );
    });
  }, [rows, search, onlyHard]);

  const updateDraft = (
    row: AdminCcAbilityRow,
    patch: Partial<Draft>,
  ) => {
    setDrafts((current) => ({
      ...current,
      [row.abilityId]: { ...effective(row), ...patch },
    }));
  };

  const saveOne = useMutation({
    mutationFn: async (row: AdminCcAbilityRow) => {
      const draft = effective(row);
      await saveAdminCcAbility(
        row.abilityId,
        draft.dispelType,
        draft.piercesImmunity,
      );
      return row;
    },
    onSuccess: async (row) => {
      setDrafts((current) => {
        const next = { ...current };
        delete next[row.abilityId];
        return next;
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin-cc-abilities"],
      });
      setStatus({
        kind: "ok",
        text: `${row.abilityName} saved.`,
      });
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
      saveAdminCcAbilitiesBulk(
        dirtyRows.map((row) => {
          const draft = effective(row);
          return {
            abilityId: row.abilityId,
            dispelType: draft.dispelType,
            piercesImmunity: draft.piercesImmunity,
          };
        }),
      ),
    onSuccess: async (result) => {
      setDrafts({});
      await queryClient.invalidateQueries({
        queryKey: ["admin-cc-abilities"],
      });
      setStatus({
        kind: "ok",
        text: `${formatNumber(result.updated)} abilities saved.`,
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
        queryClient.invalidateQueries({ queryKey: ["admin-cc-abilities"] }),
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
          className="mt-2 inline-block text-sm text-accent underline underline-offset-2"
          to="/admin/login"
        >
          Go to login page
        </Link>
      </div>
    );
  }

  const hardCount = rows.filter((row) => row.controlType === "HARD").length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-xl font-semibold">CC ability settings</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="muted">
            Signed in: <span className="font-medium">{session.data?.username}</span>
          </span>
          <button
            type="button"
            className="button"
            onClick={async () => {
              await logoutAdmin();
              await queryClient.invalidateQueries({
                queryKey: ["admin-session"],
              });
              queryClient.removeQueries({ queryKey: ["admin-cc-abilities"] });
              navigate("/admin/login", { replace: true });
            }}
          >
            Logout
          </button>
        </div>
      </div>
      <ScrollHint />

      <div className="panel mt-3 grid gap-3 p-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-stone-600">CC abilities</p>
          <p className="num font-medium">{formatNumber(rows.length)}</p>
        </div>
        <div>
          <p className="text-xs text-stone-600">Hard CC</p>
          <p className="num font-medium">{formatNumber(hardCount)}</p>
        </div>
        <div>
          <p className="text-xs text-stone-600">Shown</p>
          <p className="num font-medium">{formatNumber(filtered.length)}</p>
        </div>
        <div>
          <p className="text-xs text-stone-600">Unsaved</p>
          <p className="num font-medium">{formatNumber(dirtyRows.length)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-xs text-stone-600">Search hero or ability</span>
          <input
            className="field mt-1 block min-w-56"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Example: Magnus"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyHard}
            onChange={(event) => setOnlyHard(event.target.checked)}
          />
          Hard CC only
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

      {abilities.isPending ? <LoadingPanel label="CC abilities" /> : null}
      {abilities.isError ? (
        <ErrorPanel
          message={
            abilities.error instanceof Error
              ? abilities.error.message
              : "Failed to load CC abilities."
          }
          onRetry={() => void abilities.refetch()}
        />
      ) : null}

      {abilities.data ? (
        <>
          {filtered.length === 0 ? (
            <div className="mt-3">
              <EmptyPanel title="No abilities for this filter">
                Change the keyword or turn off the hard CC filter.
              </EmptyPanel>
            </div>
          ) : (
            <div className="scroll-x panel mt-3">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Hero</th>
                    <th scope="col">Ability</th>
                    <th scope="col">Control</th>
                    <th scope="col">Duration</th>
                    <th scope="col">Dispel</th>
                    <th scope="col">Pierces immunity</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const draft = effective(row);
                    const dirty = isDirty(row);
                    return (
                      <tr key={row.abilityId}>
                        <th scope="row" className="font-medium">
                          {row.heroName}
                        </th>
                        <td>
                          <span>{row.abilityName}</span>
                          <span className="muted mt-1 block text-xs">
                            {row.abilityKey}
                          </span>
                        </td>
                        <td>
                          <Badge
                            tone={
                              row.controlType === "HARD" ? "ok" : "neutral"
                            }
                          >
                            {row.controlType === "HARD"
                              ? "Hard"
                              : row.controlType === "SOFT"
                                ? "Soft"
                                : "-"}
                          </Badge>
                        </td>
                        <td className="num">
                          {row.duration === null
                            ? "-"
                            : formatDecimal(row.duration)}
                        </td>
                        <td>
                          <select
                            className="field"
                            aria-label={`Dispel type ${row.abilityName}`}
                            value={draft.dispelType}
                            onChange={(event) =>
                              updateDraft(row, {
                                dispelType: event.target
                                  .value as AdminCcDispel,
                              })
                            }
                          >
                            {DISPEL_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="field"
                            aria-label={`Pierces immunity ${row.abilityName}`}
                            value={draft.piercesImmunity}
                            onChange={(event) =>
                              updateDraft(row, {
                                piercesImmunity: event.target
                                  .value as AdminCcPierce,
                              })
                            }
                          >
                            {PIERCE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {dirty ? (
                            <span className="flex flex-col items-start gap-1">
                              <Badge tone="warn">Unsaved</Badge>
                              <button
                                type="button"
                                className="button small"
                                disabled={saveOne.isPending}
                                onClick={() => saveOne.mutate(row)}
                              >
                                Save
                              </button>
                            </span>
                          ) : (
                            <span className="muted text-xs">
                              {dispelLabel(row.dispelType)},{" "}
                              {pierceLabel(row.piercesImmunity)}
                            </span>
                          )}
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
