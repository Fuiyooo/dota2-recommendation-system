import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { apiGet } from "../api/client";
import type { Ability, HeroDetail } from "../api/types";
import { Badge } from "../components/Badge";
import { GameImage } from "../components/GameImage";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../components/StatePanel";
import { ScrollHint } from "../components/ScrollHint";
import {
  formatDecimal,
  isPercentValue,
  trackedDamageValues,
} from "../utils/format";
import {
  abilityIconUrl,
  attributeIconUrl,
  heroPortraitUrl,
} from "../utils/dotaAssets";

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
    return <ErrorPanel message="Invalid hero ID." />;
  }

  if (query.isPending) return <LoadingPanel label="hero detail" />;
  if (query.isError) {
    return (
      <ErrorPanel
        message={
          query.error instanceof Error ? query.error.message : "Unknown error"
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
        Back to hero list
      </Link>

      <div className="mt-3 flex items-start gap-4">
        <GameImage
          src={heroPortraitUrl(hero.name)}
          width={96}
          height={54}
          eager
        />
        <div>
          <h1 className="text-xl font-semibold">{hero.localizedName}</h1>
          <p className="muted mt-1 text-sm">
            {hero.primaryAttr} {hero.attackType} · Complexity{" "}
            {hero.complexity ?? "-"}
          </p>
          <p className="muted text-sm">{hero.roles.join(", ") || "No roles"}</p>
        </div>
      </div>
      <ScrollHint />

      <section className="mt-5" aria-labelledby="attributes-title">
        <h2 id="attributes-title" className="text-base font-semibold">
          Attributes
        </h2>
        <div className="scroll-x panel mt-2">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Attribute</th>
                <th scope="col">Base</th>
                <th scope="col">Growth</th>
                <th scope="col">Level 30</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  <span className="flex items-center gap-2">
                    <GameImage
                      src={attributeIconUrl("STR")}
                      width={18}
                      height={18}
                      variant="icon"
                    />
                    Strength
                  </span>
                </th>
                <td className="num">{formatDecimal(hero.baseStr)}</td>
                <td className="num">+{formatDecimal(hero.strGain)}</td>
                <td className="num">
                  {formatDecimal(hero.baseStr + hero.strGain * 29)}
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <span className="flex items-center gap-2">
                    <GameImage
                      src={attributeIconUrl("AGI")}
                      width={18}
                      height={18}
                      variant="icon"
                    />
                    Agility
                  </span>
                </th>
                <td className="num">{formatDecimal(hero.baseAgi)}</td>
                <td className="num">+{formatDecimal(hero.agiGain)}</td>
                <td className="num">
                  {formatDecimal(hero.baseAgi + hero.agiGain * 29)}
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <span className="flex items-center gap-2">
                    <GameImage
                      src={attributeIconUrl("INT")}
                      width={18}
                      height={18}
                      variant="icon"
                    />
                    Intelligence
                  </span>
                </th>
                <td className="num">{formatDecimal(hero.baseInt)}</td>
                <td className="num">+{formatDecimal(hero.intGain)}</td>
                <td className="num">
                  {formatDecimal(hero.baseInt + hero.intGain * 29)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6" aria-labelledby="abilities-title">
        <h2 id="abilities-title" className="text-base font-semibold">
          Abilities and innate
        </h2>
        {skills.length === 0 ? (
          <EmptyPanel title="No abilities">
            Ability data for this hero has not been stored.
          </EmptyPanel>
        ) : (
          <div className="scroll-x panel mt-2">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Ability</th>
                  <th scope="col">Type</th>
                  <th scope="col">Damage</th>
                  <th scope="col">Max level</th>
                </tr>
              </thead>
              <tbody>
                {skills.map((ability) => {
                  const damageValues = trackedDamageValues(ability);
                  return (
                    <tr key={ability.id}>
                      <th scope="row">
                        <span className="flex items-start gap-3">
                          <GameImage
                            src={abilityIconUrl(ability.abilityKey)}
                            width={48}
                            height={36}
                            variant="icon"
                          />
                          <span className="min-w-0">
                            <span className="font-medium">
                              {ability.displayName}
                            </span>
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
                          </span>
                        </span>
                      </th>
                      <td>
                        <Badge tone={abilityTone(ability)}>
                          {ability.abilityType}
                        </Badge>
                      </td>
                      <td className="num">{ability.damageType ?? "-"}</td>
                      <td className="num">{ability.maxLevel}</td>
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
          Talents
        </h2>
        {talents.length === 0 ? (
          <EmptyPanel title="No talents">
            Talent data for this hero has not been stored.
          </EmptyPanel>
        ) : (
          <div className="scroll-x panel mt-2">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Level</th>
                  <th scope="col">Talent</th>
                  <th scope="col">Linked ability</th>
                </tr>
              </thead>
              <tbody>
                {talents.map((talent) => {
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
