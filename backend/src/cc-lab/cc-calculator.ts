import {
  findValue,
  maxValue,
} from "../characteristics/shared/special-values";
import type { AbilityData } from "../characteristics/types";
import type {
  CcCoverageStatus,
  CcEffectDefinition,
  CcEffectResult,
  CcHeroResult,
  CcMultiplierConfig,
  CcScenario,
} from "./cc-types";
import { CC_ACTIVE_REGISTRY, CC_CLASSIFIED_HEROES } from "./cc-registry";

interface HeroLike {
  id: number;
  localizedName: string;
  primaryAttr: string;
  complexity: number | null;
  abilities: AbilityData[];
}

interface DurationResolution {
  value: number | null;
  status: CcCoverageStatus;
  reasons: string[];
}

function resolveDuration(
  effect: CcEffectDefinition,
  ability: AbilityData,
): DurationResolution {
  const spec = effect.duration;
  let base: number;

  if (spec.specialValue) {
    const special = findValue(ability, [spec.specialValue]);
    if (!special) {
      return {
        value: null,
        status: "UNSUPPORTED",
        reasons: [`Special value ${spec.specialValue} tidak ditemukan.`],
      };
    }
    base = maxValue(special);
  } else if (spec.fixed !== undefined) {
    base = spec.fixed;
  } else {
    return {
      value: null,
      status: "UNSUPPORTED",
      reasons: ["Spesifikasi durasi tidak lengkap."],
    };
  }

  if (!Number.isFinite(base) || base <= 0) {
    return {
      value: null,
      status: "UNSUPPORTED",
      reasons: ["Durasi tidak valid."],
    };
  }

  return { value: base, status: "SUPPORTED", reasons: [] };
}

function unionDuration(intervals: Array<{ start: number; end: number }>): number {
  if (intervals.length === 0) return 0;
  const sorted = [...intervals].sort((left, right) => left.start - right.start);
  let total = 0;
  let currentStart = sorted[0].start;
  let currentEnd = sorted[0].end;

  for (const interval of sorted.slice(1)) {
    if (interval.start <= currentEnd) {
      currentEnd = Math.max(currentEnd, interval.end);
    } else {
      total += Math.max(0, currentEnd - currentStart);
      currentStart = interval.start;
      currentEnd = interval.end;
    }
  }
  total += Math.max(0, currentEnd - currentStart);
  return total;
}


export function calculateHeroCc(
  hero: HeroLike,
  multipliers: CcMultiplierConfig,
  scenario: CcScenario,
  registry: CcEffectDefinition[] = CC_ACTIVE_REGISTRY,
  classifiedHeroes: string[] = CC_CLASSIFIED_HEROES,
): CcHeroResult {
  const definitions = registry.filter((effect) =>
    hero.abilities.some((ability) => ability.abilityKey === effect.abilityKey),
  );
  const classified =
    definitions.length > 0 || classifiedHeroes.includes(hero.localizedName);
  const effects: CcEffectResult[] = [];

  for (const definition of definitions) {
    const ability = hero.abilities.find(
      (item) => item.abilityKey === definition.abilityKey,
    );
    if (!ability) continue;

    const upgradeType = definition.upgradeType ?? "BASE";
    const confidence = definition.confidence ?? "VERIFIED";
    const instances = Math.max(1, Math.floor(definition.duration.instances ?? 1));

    const duration = resolveDuration(definition, ability);
    const reasons = [...duration.reasons];
    let status = duration.status;
    let contribution: number | null = null;

    if (duration.value !== null) {
      const strength = multipliers.controlStrength[definition.controlType];
      let dispelMultiplier = 1;
      let pierceMultiplier = 1;

      if (definition.dispelType === "UNKNOWN") {
        status = "PARTIAL";
        reasons.push("Dispel type belum diketahui, kontribusi tidak dihitung.");
      } else {
        dispelMultiplier = multipliers.dispelMultiplier[definition.dispelType];
      }

      if (scenario.useDebuffImmunityMultiplier) {
        if (definition.debuffImmunity === "UNKNOWN") {
          status = "PARTIAL";
          reasons.push(
            "Interaksi Debuff Immunity belum diketahui, kontribusi tidak dihitung.",
          );
        } else if (definition.debuffImmunity === "PARTIAL") {
          status = "PARTIAL";
          reasons.push(
            "Interaksi Debuff Immunity hanya sebagian, kontribusi tidak dihitung.",
          );
        } else {
          pierceMultiplier =
            multipliers.debuffImmunityMultiplier[definition.debuffImmunity];
        }
      }

      if (definition.isConditional) {
        status = "PARTIAL";
        if (!definition.conditionSupported) {
          reasons.push(
            "Kondisi aktivasi belum dapat disimulasikan, kontribusi tidak dihitung.",
          );
        } else if (!scenario.assumeConditionMet) {
          reasons.push("Kondisi aktivasi tidak diasumsikan terpenuhi.");
        } else {
          reasons.push(
            `Kondisi diasumsikan terpenuhi: ${
              definition.conditionDescription ?? "kondisi khusus"
            }`,
          );
        }
      }

      const conditionBlocked =
        definition.isConditional &&
        (!definition.conditionSupported || !scenario.assumeConditionMet);

      const factorsKnown =
        definition.dispelType !== "UNKNOWN" &&
        (!scenario.useDebuffImmunityMultiplier ||
          (definition.debuffImmunity !== "UNKNOWN" &&
            definition.debuffImmunity !== "PARTIAL"));

      if (!conditionBlocked && factorsKnown) {
        contribution =
          duration.value *
          instances *
          strength *
          dispelMultiplier *
          pierceMultiplier;
      } else if (status === "SUPPORTED") {
        status = "PARTIAL";
      }
    }

    const start = definition.startOffset;
    const end =
      duration.value !== null ? start + duration.value * instances : start;

    if (confidence === "AUTO") {
      status = "PARTIAL";
      reasons.push(
        "Efek dihasilkan dari klasifikasi otomatis dan perlu verifikasi.",
      );
    }

    effects.push({
      id: definition.id,
      abilityKey: definition.abilityKey,
      abilityName: ability.displayName,
      effectName: definition.effectName,
      controlType: definition.controlType,
      duration: duration.value,
      instances,
      dispelType: definition.dispelType,
      debuffImmunity: definition.debuffImmunity,
      isConditional: definition.isConditional,
      conditionDescription: definition.conditionDescription ?? null,
      start,
      end,
      rawContribution: contribution,
      status,
      upgradeType,
      confidence,
      reasons,
      sourceNote: definition.sourceNote,
    });
  }

  const groups = new Map<
    string,
    {
      controlType: CcEffectResult["controlType"];
      intervals: Array<{ start: number; end: number }>;
      effectIds: string[];
      dispelType: CcEffectResult["dispelType"];
      debuffImmunity: CcEffectResult["debuffImmunity"];
    }
  >();

  for (const effect of effects) {
    if (effect.rawContribution === null || effect.duration === null) continue;
    const key = `${effect.controlType}|${effect.dispelType}|${effect.debuffImmunity}`;
    const group = groups.get(key) ?? {
      controlType: effect.controlType,
      intervals: [],
      effectIds: [],
      dispelType: effect.dispelType,
      debuffImmunity: effect.debuffImmunity,
    };
    const perInstance = effect.duration;
    for (let index = 0; index < effect.instances; index += 1) {
      group.intervals.push({
        start: effect.start + index * perInstance,
        end: effect.start + (index + 1) * perInstance,
      });
    }
    group.effectIds.push(effect.id);
    groups.set(key, group);
  }

  const overlapGroups = [...groups.values()].map((group) => {
    const union = unionDuration(group.intervals);
    const sumDurations = group.intervals.reduce(
      (sum, interval) => sum + (interval.end - interval.start),
      0,
    );
    const strength = multipliers.controlStrength[group.controlType];
    const dispelMultiplier =
      group.dispelType === "UNKNOWN"
        ? 1
        : multipliers.dispelMultiplier[group.dispelType];
    const pierceMultiplier =
      !scenario.useDebuffImmunityMultiplier ||
      group.debuffImmunity === "UNKNOWN" ||
      group.debuffImmunity === "PARTIAL"
        ? 1
        : multipliers.debuffImmunityMultiplier[group.debuffImmunity];
    return {
      controlType: group.controlType,
      unionDuration: union,
      contribution: union * strength * dispelMultiplier * pierceMultiplier,
      effectIds: group.effectIds,
      conflict: group.effectIds.length > 1 && union < sumDurations - 1e-9,
    };
  });

  const totalCc = overlapGroups.reduce(
    (sum, group) => sum + group.contribution,
    0,
  );
  const applicable = effects.filter(
    (effect) => effect.status !== "NOT_APPLICABLE",
  );
  const unsupportedCount = applicable.filter(
    (effect) => effect.rawContribution === null,
  ).length;

  let status: CcCoverageStatus = "SUPPORTED";
  if (definitions.length === 0) {
    status = classified ? "NOT_APPLICABLE" : "UNSUPPORTED";
  } else if (applicable.length === 0) {
    status = "NOT_APPLICABLE";
  } else if (
    applicable.some(
      (effect) =>
        effect.status === "PARTIAL" ||
        effect.status === "UNSUPPORTED" ||
        effect.status === "ERROR",
    )
  ) {
    status = totalCc > 0 ? "PARTIAL" : "UNSUPPORTED";
  }

  return {
    heroId: hero.id,
    heroName: hero.localizedName,
    primaryAttr: hero.primaryAttr,
    complexity: hero.complexity,
    classified,
    totalCc,
    effectCount: effects.length,
    unsupportedCount,
    status,
    effects,
    overlapGroups,
  };
}
