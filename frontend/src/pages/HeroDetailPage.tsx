import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { apiGet } from "../api/client";
import type { Ability, HeroDetail } from "../api/types";
import { Badge } from "../components/Badge";
import { GameImage } from "../components/GameImage";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../components/StatePanel";
import { ScrollHint } from "../components/ScrollHint";
import { formatDecimal } from "../utils/format";
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
      <Link className="text-sm text-link underline underline-offset-2" to="/heroes">
        Kembali ke daftar hero
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
          <p className="muted text-sm">{hero.roles.join(", ") || "Role belum ada"}</p>
        </div>
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
          Ability dan innate
        </h2>
        {skills.length === 0 ? (
          <EmptyPanel title="Tidak ada ability">
            Data ability hero ini belum tersimpan.
          </EmptyPanel>
        ) : (
          <div className="mt-2 space-y-3">
                {skills.map((ability) => {
                  const description = ability.rawData?.desc_loc;
                  const lore = ability.rawData?.lore_loc;
                  const values = Array.isArray(ability.specialValues)
                    ? ability.specialValues.filter(
                        (value) => value.values.length > 0,
                      )
                    : [];

                  return (
                    <article key={ability.id} className="panel p-4">
                      <div className="flex items-start gap-3">
                        <GameImage
                          src={abilityIconUrl(ability.abilityKey)}
                          width={48}
                          height={36}
                          variant="icon"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium">
                              {ability.displayName}
                            </h3>
                            <Badge tone={abilityTone(ability)}>
                              {ability.abilityType}
                            </Badge>
                            <span className="muted text-xs">
                              Max level {ability.maxLevel}
                            </span>
                            {ability.damageType ? (
                              <span className="muted text-xs">
                                · {ability.damageType}
                              </span>
                            ) : null}
                          </div>

                          {description ? (
                            <p className="muted mt-2 text-sm">{description}</p>
                          ) : null}
                          {lore ? (
                            <p className="muted mt-2 text-xs italic">{lore}</p>
                          ) : null}

                          {values.length > 0 ? (
                            <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                              {values.map((value) => (
                                <div
                                  key={value.name}
                                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line-soft py-1"
                                >
                                  <dt className="text-muted">
                                    {value.heading || value.name}
                                  </dt>
                                  <dd className="num text-right">
                                    {value.values.map((item) => formatDecimal(item)).join(" / ")}{value.isPercentage ? "%" : ""}
                                    {value.scepterValues.length > 0
                                      ? ` · Scepter ${value.scepterValues.map((item) => formatDecimal(item)).join(" / ")}`
                                      : ""}
                                    {value.shardValues.length > 0
                                      ? ` · Shard ${value.shardValues.map((item) => formatDecimal(item)).join(" / ")}`
                                      : ""}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
        )}
      </section>

      <section className="mt-6" aria-labelledby="talents-title">
        <h2 id="talents-title" className="text-base font-semibold">
          Talent
        </h2>
        {talents.length === 0 ? (
          <EmptyPanel title="Tidak ada talent">
            Data talent hero ini belum tersimpan.
          </EmptyPanel>
        ) : (
          <div className="scroll-x panel mt-2">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Level</th>
                  <th scope="col">Talent</th>
                  <th scope="col">Linked Ability</th>
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
