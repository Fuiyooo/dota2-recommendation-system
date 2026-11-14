import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { apiGet } from "../api/client";
import type {
  BreakdownResponse,
  CharacteristicName,
  HeroCharacteristicsResponse,
  IndicatorScore,
} from "../api/types";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../components/StatePanel";
import { ScrollHint } from "../components/ScrollHint";
import { formatDecimal } from "../utils/format";

const CHARACTERISTIC_LABEL: Record<CharacteristicName, string> = {
  damage: "Damage",
  durability: "Durability",
  crowdControl: "Crowd Control",
  mobility: "Mobility / Escape",
};

const INDICATOR_LABEL: Record<string, string> = {
  physicalDamage: "Physical Damage",
  magicDamage: "Magic Damage",
  pureDamage: "Pure Damage",
  maxHp: "Maximum HP",
  armor: "Armor",
  magicResistance: "Magic Resistance",
  disableDuration: "Disable Duration",
  aoe: "AoE / Coverage",
  castRange: "Cast Range",
  movementSpeed: "Movement Speed",
  mobilityDistance: "Blink / Dash Distance",
  dashDistance: "Dash Distance",
  blinkDistance: "Blink Distance",
};

export function CharacteristicDetailPage() {
  const { heroId } = useParams();
  const id = Number(heroId);
  const validId = Number.isInteger(id) && id > 0;

  const heroQuery = useQuery({
    queryKey: ["characteristics-hero", id],
    queryFn: () =>
      apiGet<HeroCharacteristicsResponse>(`/characteristics/heroes/${id}`),
    enabled: validId,
  });
  const breakdownQuery = useQuery({
    queryKey: ["characteristics-breakdown", id],
    queryFn: () =>
      apiGet<BreakdownResponse>(`/characteristics/heroes/${id}/breakdown`),
    enabled: validId,
  });

  if (!validId) return <ErrorPanel message="ID hero tidak valid." />;
  if (heroQuery.isPending || breakdownQuery.isPending) {
    return <LoadingPanel label="rincian karakteristik" />;
  }
  if (heroQuery.isError || breakdownQuery.isError) {
    const error = heroQuery.error ?? breakdownQuery.error;
    return (
      <ErrorPanel
        message={error instanceof Error ? error.message : "Error tidak dikenal"}
        onRetry={() => {
          void heroQuery.refetch();
          void breakdownQuery.refetch();
        }}
      />
    );
  }

  const hero = heroQuery.data.hero;
  const run = heroQuery.data.run;
  const characteristics = heroQuery.data.characteristics;
  const indicators = breakdownQuery.data.indicators;

  if (!run || !hero) {
    return (
      <EmptyPanel title="Belum ada hasil perhitungan">
        Jalankan <span className="num">npm run calculate</span> terlebih dahulu.
      </EmptyPanel>
    );
  }

  const scoreByIndicator = new Map<string, IndicatorScore>();
  for (const characteristic of characteristics) {
    for (const indicator of characteristic.indicators) {
      scoreByIndicator.set(indicator.indicator, indicator);
    }
  }

  const damageDetail = indicators.find(
    (indicator) =>
      indicator.characteristic === "damage" &&
      indicator.indicator === "physicalDamage",
  )?.detail as
    | {
        damageProfile?: { main?: string; secondary?: string };
        basicAttack?: { counted?: boolean };
      }
    | undefined;
  const damageProfile = damageDetail?.damageProfile;

  return (
    <div>
      <Link className="text-sm text-link underline underline-offset-2" to="/characteristics">
        Kembali ke karakteristik
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{hero.localizedName}</h1>
          <p className="muted mt-1 text-sm">
            {hero.primaryAttr} · {hero.attackType}
          </p>
        </div>
        <Link className="text-sm text-link underline underline-offset-2" to={`/heroes/${hero.id}`}>
          Lihat data hero
        </Link>
      </div>
      <ScrollHint />

      {damageProfile ? (
        <div className="panel mt-3 grid gap-2 p-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted">Profil damage</p>
            <p className="font-medium">
              Main {damageProfile.main ?? "-"} · Secondary{" "}
              {damageProfile.secondary ?? "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Basic attack</p>
            <p className="font-medium">
              {damageDetail?.basicAttack?.counted ? "Dihitung" : "Tidak dihitung"}
            </p>
          </div>
        </div>
      ) : null}

      <section className="mt-4" aria-labelledby="summary-title">
        <h2 id="summary-title" className="text-base font-semibold">
          Skor karakteristik
        </h2>
        <div className="scroll-x panel mt-2">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Characteristic</th>
                <th scope="col">Score</th>
              </tr>
            </thead>
            <tbody>
              {characteristics.map((characteristic) => (
                <tr key={characteristic.id}>
                  <th scope="row">
                    {CHARACTERISTIC_LABEL[characteristic.characteristic]}
                  </th>
                  <td className="num">
                    {characteristic.score === null
                      ? "-"
                      : formatDecimal(characteristic.score)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-5" aria-labelledby="indicator-title">
        <h2 id="indicator-title" className="text-base font-semibold">
          Rincian indikator
        </h2>
        <div className="scroll-x panel mt-2">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Characteristic</th>
                <th scope="col">Indicator</th>
                <th scope="col">Raw</th>
                <th scope="col">Unit</th>
                <th scope="col">Percentile</th>
                <th scope="col">Score</th>
              </tr>
            </thead>
            <tbody>
              {indicators.map((indicator) => {
                const score = scoreByIndicator.get(indicator.indicator);
                return (
                  <tr key={indicator.id}>
                    <td className="muted text-xs">
                      {CHARACTERISTIC_LABEL[indicator.characteristic]}
                    </td>
                    <th scope="row">
                      {INDICATOR_LABEL[indicator.indicator] ?? indicator.indicator}
                    </th>
                    <td className="num">
                      {indicator.rawValue === null
                        ? "-"
                        : formatDecimal(indicator.rawValue)}
                    </td>
                    <td className="muted text-xs">{indicator.unit}</td>
                    <td className="num">
                      {score?.percentile === null || score?.percentile === undefined
                        ? "-"
                        : `${formatDecimal(score.percentile)}%`}
                    </td>
                    <td className="num">{score?.score ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
