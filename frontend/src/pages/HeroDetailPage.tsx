import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { apiGet } from "../api/client";
import type { Ability, HeroDetail } from "../api/types";
import { Badge, validationTone } from "../components/Badge";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../components/StatePanel";
import { ScrollHint } from "../components/ScrollHint";
import {
  formatDecimal,
  isPercentValue,
  talentValues,
  trackedDamageValues,
} from "../utils/format";

function abilityTone(ability: Ability) {
  if (ability.abilityType === "Innate") return "accent" as const;
  if (ability.abilityType === "Ultimate") return "accent" as const;
  if (ability.abilityType === "Talent") return "neutral" as const;
  return "neutral" as const;
}

export function HeroDetailPage() {
  const { heroId } = useParams();
  const id = Number(heroId);
  const validId = Number.isInteger(id) && id > 0;

  const query = useQuery({
    queryKey: ["hero", id],
    queryFn: () => apiGet<HeroDetail>(`/heroes/${id}`),
    enabled: validId,
  });

  if (!validId) {
    return <ErrorPanel message="ID hero tidak valid." />;
  }

  if (query.isPending) return <LoadingPanel label="detail hero" />;
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

  const hero = query.data;
  const talents = hero.abilities
    .filter((ability) => ability.abilityType === "Talent")
    .sort((left, right) => (left.talentLevel ?? 0) - (right.talentLevel ?? 0));
  const skills = hero.abilities.filter(
    (ability) => ability.abilityType !== "Talent",
  );
  const abilityByKey = new Map(
    hero.abilities.map((ability) => [ability.abilityKey, ability]),
  );

  return (
    <div>
      <Link className="text-sm text-accent underline underline-offset-2" to="/heroes">
        Kembali ke daftar hero
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{hero.localizedName}</h1>
          <p className="muted mt-1 text-sm">
            {hero.primaryAttr} {hero.attackType} · Complexity{" "}
            {hero.complexity ?? "-"}
          </p>
          <p className="muted text-sm">{hero.roles.join(", ") || "Role belum ada"}</p>
        </div>
        <p className="text-sm muted">
          {hero.abilities.length} baris ability dan talent
        </p>
      </div>
      <ScrollHint />

      <section className="mt-5" aria-labelledby="attributes-title">
        <h2 id="attributes-title" className="text-base font-semibold">
          Atribut
        </h2>
        <div className="scroll-x panel mt-2">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Atribut</th>
                <th scope="col">Base</th>
                <th scope="col">Growth</th>
                <th scope="col">Level 30</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Strength</th>
                <td className="num">{formatDecimal(hero.baseStr)}</td>
                <td className="num">+{formatDecimal(hero.strGain)}</td>
                <td className="num">
                  {formatDecimal(hero.baseStr + hero.strGain * 29)}
                </td>
              </tr>
              <tr>
                <th scope="row">Agility</th>
                <td className="num">{formatDecimal(hero.baseAgi)}</td>
                <td className="num">+{formatDecimal(hero.agiGain)}</td>
                <td className="num">
                  {formatDecimal(hero.baseAgi + hero.agiGain * 29)}
                </td>
              </tr>
              <tr>
                <th scope="row">Intelligence</th>
                <td className="num">{formatDecimal(hero.baseInt)}</td>
                <td className="num">+{formatDecimal(hero.intGain)}</td>
                <td className="num">
                  {formatDecimal(hero.baseInt + hero.intGain * 29)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted mt-2 text-xs">
          Level 30 dihitung sebagai base + growth × 29. Angka ini hanya bantuan
          baca, bukan bagian dari skor karakteristik.
        </p>
      </section>

      <section className="mt-6" aria-labelledby="abilities-title">
        <h2 id="abilities-title" className="text-base font-semibold">
          Ability dan innate
        </h2>
        {skills.length === 0 ? (
          <EmptyPanel title="Tidak ada ability">
            Data ability untuk hero ini belum tersimpan.
          </EmptyPanel>
        ) : (
          <div className="scroll-x panel mt-2">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Ability</th>
                  <th scope="col">Tipe</th>
                  <th scope="col">Damage</th>
                  <th scope="col">Max level</th>
                  <th scope="col">Validasi</th>
                </tr>
              </thead>
              <tbody>
                {skills.map((ability) => {
                  const damageValues = trackedDamageValues(ability);
                  return (
                    <tr key={ability.id}>
                      <th scope="row">
                        <span className="font-medium">{ability.displayName}</span>
                        <span className="muted num block text-xs">
                          {ability.abilityKey}
                        </span>
                        {damageValues.map((value) => (
                          <span
                            key={value.name}
                            className="muted num mt-1 block text-xs"
                          >
                            {value.heading || `${value.name}:`}{" "}
                            {value.values.join(" / ")}
                            {isPercentValue(value) ? "%" : ""}
                          </span>
                        ))}
                      </th>
                      <td>
                        <Badge tone={abilityTone(ability)}>
                          {ability.abilityType}
                        </Badge>
                      </td>
                      <td className="num">{ability.damageType ?? "-"}</td>
                      <td className="num">{ability.maxLevel}</td>
                      <td>
                        <Badge tone={validationTone(ability.validationStatus)}>
                          {ability.validationStatus}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6" aria-labelledby="talents-title">
        <h2 id="talents-title" className="text-base font-semibold">
          Talent
        </h2>
        {talents.length === 0 ? (
          <EmptyPanel title="Tidak ada talent">
            Data talent untuk hero ini belum tersimpan.
          </EmptyPanel>
        ) : (
          <div className="scroll-x panel mt-2">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Level</th>
                  <th scope="col">Talent</th>
                  <th scope="col">Ability terkait</th>
                  <th scope="col">Nilai bonus</th>
                  <th scope="col">Validasi</th>
                </tr>
              </thead>
              <tbody>
                {talents.map((talent) => {
                  const refs = talentValues(talent).bonusRefs ?? [];
                  const linked = talent.linkedAbilityKey
                    ? abilityByKey.get(talent.linkedAbilityKey)
                    : undefined;
                  return (
                    <tr key={talent.id}>
                      <td className="num">{talent.talentLevel ?? "-"}</td>
                      <th scope="row">
                        <span className="font-medium">{talent.displayName}</span>
                        <span className="muted num block text-xs">
                          {talent.abilityKey}
                        </span>
                      </th>
                      <td className="muted">
                        {linked?.displayName ?? talent.linkedAbilityKey ?? "-"}
                      </td>
                      <td className="text-xs whitespace-normal break-words">
                        {refs.length === 0
                          ? "-"
                          : refs
                              .map(
                                (ref) =>
                                  `${ref.abilityKey ?? "hero"}.${ref.specialValue} ${formatDecimal(ref.value)}`,
                              )
                              .join("; ")}
                      </td>
                      <td>
                        <Badge tone={validationTone(talent.validationStatus)}>
                          {talent.validationStatus}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
