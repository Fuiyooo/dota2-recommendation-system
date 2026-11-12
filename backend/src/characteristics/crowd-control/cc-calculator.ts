import type {
  AbilityData,
  CalculationStatus,
  HeroData,
} from "../types";
import {
  findByKeyword,
  findValue,
  maxValue,
  specialValuesOf,
  talentRefsOf,
} from "../shared/special-values";
import {
  CC_MAIN_EXCLUDED,
  CC_MAIN_METADATA,
  CC_MAIN_OVERRIDES,
  CC_MAIN_REVIEW,
} from "./cc-main-config";
import type {
  CcAbilityConfigEntry,
  CcAbilityConfigMap,
  CcDispelType,
  CcMainMetadata,
  CcMainOverride,
} from "./cc-main-config";

const HARD_CC = [
  "stun",
  "hex",
  "fear",
  "taunt",
  "sleep",
  "hypnotize",
  "berserk",
  "cyclone",
  "banish",
  "petrify",
];

const SOFT_CC = [
  "root",
  "silence",
  "slow",
  "mute",
  "leash",
  "entangle",
  "break",
];

const HARD_DURATION_WORDS = [
  "stun",
  "hex",
  "fear",
  "taunt",
  "banish",
  "sleep",
  "hypnotize",
  "petrify",
  "stone",
  "cyclone",
];

const SOFT_DURATION_WORDS = [
  "slow",
  "root",
  "silence",
  "mute",
  "leash",
  "entangle",
];

const DURATION_NAME_EXCLUDED = [
  "pct",
  "percent",
  "tooltip",
  "linger",
  "stack",
  "cooldown",
  "regen",
  "multiplier",
  "interval",
  "resistance",
];

const GENERIC_DURATION_NAMES = new Set([
  "duration",
  "abilityduration",
  "debuff_duration",
  "max_duration",
]);

export interface CrowdControlCalculation {
  disableDuration: number;
  aoe: number;
  castRange: number;
  status: CalculationStatus;
  detail: Record<string, unknown>;
}

function hasKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function rawData(ability: AbilityData): Record<string, unknown> {
  return ability.rawData && typeof ability.rawData === "object"
    ? (ability.rawData as Record<string, unknown>)
    : {};
}

function descriptionText(ability: AbilityData): string {
  const raw = rawData(ability);
  const description =
    typeof raw.desc_loc === "string" ? raw.desc_loc : "";
  return `${ability.displayName} ${description}`.toLowerCase();
}

function isExcludedDurationName(name: string): boolean {
  const lower = name.toLowerCase();
  return DURATION_NAME_EXCLUDED.some((part) => lower.includes(part));
}

function isDurationName(name: string, words: string[]): boolean {
  const lower = name.toLowerCase();
  if (!lower.includes("duration")) return false;
  if (isExcludedDurationName(lower)) return false;
  if (GENERIC_DURATION_NAMES.has(lower)) return false;
  return words.some((word) => lower.includes(word));
}

function talentAdjustedDuration(
  base: number,
  abilityKey: string,
  valueName: string,
  talents: AbilityData[],
): number {
  let additive = 0;
  let percentage = 0;
  for (const talent of talents) {
    for (const ref of talentRefsOf(talent)) {
      if (ref.abilityKey !== abilityKey || ref.specialValue !== valueName) {
        continue;
      }
      if (ref.operation === 3) percentage += ref.value;
      else if (ref.operation === 0) additive += ref.value;
    }
  }
  return (base + additive) * (1 + percentage / 100);
}

function durationOf(
  ability: AbilityData,
  name: string,
  talents: AbilityData[],
): number {
  const value = findValue(ability, [name]);
  if (!value) return 0;
  return talentAdjustedDuration(
    maxValue(value),
    ability.abilityKey,
    name,
    talents,
  );
}

function ccDuration(
  ability: AbilityData,
  control: "HARD" | "SOFT",
  talents: AbilityData[],
): { duration: number; field: string | null; fallback: boolean } {
  const words = control === "HARD" ? HARD_DURATION_WORDS : SOFT_DURATION_WORDS;
  const values = specialValuesOf(ability).filter(
    (value) => value.values.length > 0 && maxValue(value) > 0,
  );

  const specific = values.filter((value) =>
    isDurationName(value.name, words),
  );
  if (specific.length > 0) {
    const best = specific.reduce((left, right) =>
      maxValue(right) > maxValue(left) ? right : left,
    );
    return {
      duration: talentAdjustedDuration(
        maxValue(best),
        ability.abilityKey,
        best.name,
        talents,
      ),
      field: best.name,
      fallback: false,
    };
  }

  const generic = values.filter((value) =>
    GENERIC_DURATION_NAMES.has(value.name.toLowerCase()),
  );
  if (generic.length > 0) {
    const best = generic.reduce((left, right) =>
      maxValue(right) > maxValue(left) ? right : left,
    );
    return {
      duration: talentAdjustedDuration(
        maxValue(best),
        ability.abilityKey,
        best.name,
        talents,
      ),
      field: best.name,
      fallback: false,
    };
  }

  const fallback = values.filter(
    (value) =>
      value.name.toLowerCase().includes("duration") &&
      !isExcludedDurationName(value.name),
  );
  if (fallback.length > 0) {
    const best = fallback.reduce((left, right) =>
      maxValue(right) > maxValue(left) ? right : left,
    );
    return {
      duration: talentAdjustedDuration(
        maxValue(best),
        ability.abilityKey,
        best.name,
        talents,
      ),
      field: best.name,
      fallback: true,
    };
  }

  return { duration: 0, field: null, fallback: false };
}

function dispelValue(dispelType: CcDispelType): number {
  if (dispelType === "STRONG") return 0.8;
  if (dispelType === "UNDISPELLABLE") return 1;
  return 0.6;
}

function dispelMultiplier(
  ability: AbilityData,
  meta: CcMainMetadata | undefined,
  entry: CcAbilityConfigEntry | undefined,
  override: CcMainOverride | undefined,
): {
  value: number;
  source: "manual" | "valve" | "assumed";
  raw: number | null;
} {
  const raw = rawData(ability).dispellable;
  if (entry) {
    return {
      value: dispelValue(entry.dispelType),
      source: "manual",
      raw: typeof raw === "number" ? raw : null,
    };
  }
  if (override?.dispelType) {
    return {
      value: dispelValue(override.dispelType),
      source: "manual",
      raw: typeof raw === "number" ? raw : null,
    };
  }
  if (meta?.cannotBeDispelled) {
    return {
      value: 1,
      source: "manual",
      raw: typeof raw === "number" ? raw : null,
    };
  }
  if (raw === 1) return { value: 0.8, source: "valve", raw: 1 };
  if (raw === 2) return { value: 0.6, source: "valve", raw: 2 };
  if (raw === 3) return { value: 1, source: "valve", raw: 3 };
  return { value: 0.6, source: "assumed", raw: null };
}

function pierceMultiplier(
  ability: AbilityData,
  meta: CcMainMetadata | undefined,
  entry: CcAbilityConfigEntry | undefined,
  override: CcMainOverride | undefined,
): {
  value: number;
  source: "manual" | "valve" | "assumed";
  pierces: boolean | null;
} {
  if (entry?.piercesImmunity === true) {
    return { value: 1, source: "manual", pierces: true };
  }
  if (entry?.piercesImmunity === false) {
    return { value: 0.6, source: "manual", pierces: false };
  }
  if (override?.piercesImmunity === true) {
    return { value: 1, source: "manual", pierces: true };
  }
  if (override?.piercesImmunity === false) {
    return { value: 0.6, source: "manual", pierces: false };
  }
  if (meta?.piercesImmunity !== undefined) {
    return {
      value: meta.piercesImmunity ? 1 : 0.6,
      source: "manual",
      pierces: meta.piercesImmunity,
    };
  }
  const raw = rawData(ability).immunity;
  if (raw === 3) return { value: 1, source: "valve", pierces: true };
  if (raw === 4) return { value: 0.6, source: "valve", pierces: false };
  return { value: 0.6, source: "assumed", pierces: null };
}

export function calculateCrowdControl(
  hero: HeroData,
  talents: AbilityData[],
  config: CcAbilityConfigMap = new Map(),
): CrowdControlCalculation {
  let hardDuration = 0;
  let hardContribution = 0;
  let softDuration = 0;
  let aoe = 0;
  let castRange = 0;
  let ccAbilities = 0;
  const unresolved: string[] = [];
  const details: Array<Record<string, unknown>> = [];

  for (const ability of hero.abilities) {
    if (ability.abilityType === "Talent") continue;
    if (CC_MAIN_EXCLUDED.has(ability.abilityKey)) continue;
    const meta = CC_MAIN_METADATA[ability.abilityKey];
    const entry = config.get(ability.abilityKey);
    if (meta?.notCc) continue;

    const override = CC_MAIN_OVERRIDES[ability.abilityKey];
    const review = CC_MAIN_REVIEW[ability.abilityKey];
    const text = descriptionText(ability);
    const displayName = override?.displayName ?? ability.displayName;
    const hard = override
      ? override.control === "HARD"
      : hasKeyword(text, HARD_CC);
    const soft = override
      ? override.control === "SOFT"
      : hasKeyword(text, SOFT_CC);
    if (!hard && !soft) continue;

    ccAbilities += 1;
    let duration = 0;
    let field: string | null = null;

    if (override) {
      if (override.fixed !== undefined) {
        duration = override.fixed;
      } else if (override.minField && override.maxField) {
        const min = durationOf(ability, override.minField, talents);
        const max = durationOf(ability, override.maxField, talents);
        duration = min + max > 0 ? (min + max) / 2 : 0;
      } else if (override.field) {
        duration = durationOf(ability, override.field, talents);
        field = override.field;
      }
    } else {
      const resolved = ccDuration(
        ability,
        hard ? "HARD" : "SOFT",
        talents,
      );
      duration = resolved.duration;
      field = resolved.field;
      if (resolved.fallback && duration > 0 && hard) {
        unresolved.push(
          `${ability.displayName}: durasi memakai field ${resolved.field} yang perlu verifikasi.`,
        );
      }
    }

    if (review) {
      duration = 0;
      unresolved.push(`${ability.displayName}: ${review}`);
    }

    const dispel = dispelMultiplier(ability, meta, entry, override);
    const pierce = pierceMultiplier(ability, meta, entry, override);
    const contribution = hard
      ? duration * dispel.value * pierce.value
      : 0;

    const radiusValues = findByKeyword(ability, [
      "radius",
      "aoe",
      "effect_radius",
      "area_of_effect",
      "width",
    ]);
    const abilityAoe =
      override?.aoe ??
      (radiusValues.length > 0
        ? Math.max(...radiusValues.map((value) => maxValue(value)))
        : 0);

    const rangeValues = findByKeyword(ability, [
      "cast_range",
      "castrange",
      "abilitycastrange",
      "cast range",
    ]);
    const abilityRange =
      override?.castRange ??
      (rangeValues.length > 0
        ? Math.max(...rangeValues.map((value) => maxValue(value)))
        : 0);

    if (hard) {
      hardDuration += duration;
      hardContribution += contribution;
      aoe = Math.max(aoe, abilityAoe);
      castRange = Math.max(castRange, abilityRange);
    }
    if (soft) softDuration += duration;

    if (hard && duration <= 0) {
      unresolved.push(
        `${displayName}: jenis CC terdeteksi, durasi belum pasti.`,
      );
    }
    if (hard && abilityAoe <= 0 && abilityRange <= 0 && !override?.noRange) {
      unresolved.push(
        `${displayName}: AoE dan cast range belum terbaca.`,
      );
    }

    details.push({
      ability: displayName,
      hard,
      soft,
      duration,
      durationField: field,
      contribution,
      dispelMultiplier: dispel.value,
      dispelSource: dispel.source,
      dispellable: dispel.raw,
      pierceMultiplier: pierce.value,
      pierceSource: pierce.source,
      piercesImmunity: pierce.pierces,
      immunity: rawData(ability).immunity ?? null,
      aoe: abilityAoe,
      castRange: abilityRange,
      ...(override ? { override: override.note } : {}),
      ...(review ? { review } : {}),
    });
  }

  const status: CalculationStatus =
    ccAbilities === 0 || unresolved.length === 0 ? "SUPPORTED" : "PARTIAL";

  return {
    disableDuration: hardContribution,
    aoe,
    castRange,
    status,
    detail: {
      hardDuration,
      hardContribution,
      softDuration,
      softIgnored: true,
      dispelApplied: true,
      debuffImmunityApplied: true,
      weightedDuration: hardContribution,
      ccAbilities,
      selectedTalents: talents.map((talent) => talent.displayName),
      abilities: details,
      unresolved,
    },
  };
}
