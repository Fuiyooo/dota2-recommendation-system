import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { apiGet } from "../api/client";
import type {
  CcCoverageStatus,
  CcEffect,
  CcLabHeroResponse,
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

function durationText(effect: CcEffect): string {
  if (effect.duration === null) return "-";
  if (effect.instances > 1) {
    return `${formatDecimal(effect.duration)} × ${effect.instances} instance`;
  }
  return formatDecimal(effect.duration);
}

export function CcLabDetailPage() {
  const { heroId } = useParams();
  const id = Number(heroId);
  const validId = Number.isInteger(id) && id > 0;

  const query = useQuery({
    queryKey: ["cc-lab-hero", id],
    queryFn: () =>
      apiGet<CcLabHeroResponse>(
        `/cc-lab/heroes/${id}?assumeConditionMet=true`,
      ),
    enabled: validId,
  });

  if (!validId) return <ErrorPanel message="ID hero tidak valid." />;
  if (query.isPending) return <LoadingPanel label="detail CC Lab" />;
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

  const result = query.data.result;
  if (!result) {
    return (
      <EmptyPanel title="Hero tidak ditemukan">
        Kembali ke halaman CC Lab.
      </EmptyPanel>
    );
  }

  return (
    <div>
      <Link className="text-sm text-accent underline underline-offset-2" to="/cc-lab">
        Kembali ke CC Lab
      </Link>

      <div className="mt-3">
        <h1 className="text-xl font-semibold">{result.heroName}</h1>
        <p className="muted mt-1 text-sm">
          {result.primaryAttr} · Complexity{" "}
          {result.complexity === null
            ? "-"
            : `${result.complexity} (${COMPLEXITY_LABEL[result.complexity] ?? "-"})`}{" "}
          · Config {query.data.configVersion}
        </p>
      </div>
      <ScrollHint />

      <div className="panel mt-3 grid gap-3 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-stone-600">CC total</p>
          <p className="num text-lg font-medium">
            {formatDecimal(result.totalCc)}
          </p>
        </div>
        <div>
          <p className="text-xs text-stone-600">Status</p>
          <Badge tone={statusTone(result.status)}>{result.status}</Badge>
        </div>
        <div>
          <p className="text-xs text-stone-600">Efek terdaftar</p>
          <p className="num font-medium">{result.effectCount}</p>
        </div>
        <div>
          <p className="text-xs text-stone-600">Tidak dihitung</p>
          <p className="num font-medium">{result.unsupportedCount}</p>
        </div>
      </div>

      <section className="mt-5" aria-labelledby="cc-effects-title">
        <h2 id="cc-effects-title" className="text-base font-semibold">
          Efek CC
        </h2>
        <div className="scroll-x panel mt-2">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Ability / efek</th>
                <th scope="col">Upgrade</th>
                <th scope="col">Control</th>
                <th scope="col">Durasi</th>
                <th scope="col">Dispel</th>
                <th scope="col">Debuff Immunity</th>
                <th scope="col">Conditional</th>
                <th scope="col">Kontribusi</th>
                <th scope="col">Status</th>
                <th scope="col">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {result.effects.map((effect) => (
                <tr key={effect.id}>
                  <th scope="row">
                    <span className="font-medium">{effect.effectName}</span>
                    <span className="muted num block text-xs">
                      {effect.abilityKey}
                    </span>
                  </th>
                  <td className="text-xs">
                    <Badge tone="neutral">{effect.upgradeType}</Badge>
                    <span className="muted block">{effect.confidence}</span>
                  </td>
                  <td>
                    <Badge tone="neutral">{effect.controlType}</Badge>
                  </td>
                  <td className="num">{durationText(effect)}</td>
                  <td className="text-xs">{effect.dispelType}</td>
                  <td className="text-xs">{effect.debuffImmunity}</td>
                  <td className="text-xs">
                    {effect.isConditional ? (
                      <>
                        <span>Ya</span>
                        {effect.conditionDescription ? (
                          <span className="muted block">
                            {effect.conditionDescription}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      "Tidak"
                    )}
                  </td>
                  <td className="num">
                    {effect.rawContribution === null
                      ? "-"
                      : formatDecimal(effect.rawContribution)}
                  </td>
                  <td>
                    <Badge tone={statusTone(effect.status)}>
                      {effect.status}
                    </Badge>
                  </td>
                  <td className="text-xs">
                    {effect.reasons.length > 0 ? (
                      <ul className="list-disc pl-4">
                        {effect.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    ) : (
                      "Dihitung."
                    )}
                    <details className="mt-1">
                      <summary className="cursor-pointer text-accent">
                        Sumber
                      </summary>
                      <p className="muted mt-1">{effect.sourceNote}</p>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted mt-2 text-xs">
          Kontribusi per efek adalah durasi × control strength × multiplier.
          Total hero memakai durasi union untuk efek dengan control dan
          multiplier yang sama.
        </p>
      </section>

      <section className="mt-5" aria-labelledby="cc-overlap-title">
        <h2 id="cc-overlap-title" className="text-base font-semibold">
          Overlap
        </h2>
        {result.overlapGroups.length === 0 ? (
          <div className="mt-2">
            <EmptyPanel title="Tidak ada efek yang dihitung">
              Efek yang tidak diketahui tidak dimasukkan ke total.
            </EmptyPanel>
          </div>
        ) : (
          <div className="scroll-x panel mt-2">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Control</th>
                  <th scope="col">Union duration</th>
                  <th scope="col">Kontribusi</th>
                  <th scope="col">Efek</th>
                  <th scope="col">Overlap</th>
                </tr>
              </thead>
              <tbody>
                {result.overlapGroups.map((group) => (
                  <tr key={`${group.controlType}-${group.effectIds.join("-")}`}>
                    <th scope="row">{group.controlType}</th>
                    <td className="num">{formatDecimal(group.unionDuration)}</td>
                    <td className="num">{formatDecimal(group.contribution)}</td>
                    <td className="num text-xs">{group.effectIds.length}</td>
                    <td>
                      <Badge tone={group.conflict ? "warn" : "neutral"}>
                        {group.conflict ? "Ada overlap" : "Tidak overlap"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted mt-2 text-xs">
          Skenario detail memakai kondisi dianggap terpenuhi, tanpa item,
          Debuff Immunity multiplier mati. Aghanim&apos;s Scepter dan Shard
          tidak dihitung. Conditional tetap berstatus PARTIAL.
        </p>
      </section>
    </div>
  );
}
