import type { OpenDotaHero } from "../data-sources/opendota/opendota.types";
import type {
  ValveAbility,
  ValveBonus,
  ValveHero,
  ValveSpecialValue,
  ValveTalent,
} from "../data-sources/valve/valve.types";

export interface NormalizedHero {
  id: number;
  name: string;
  localizedName: string;
  primaryAttr: string;
  attackType: string;
  roles: string[];
  baseStr: number;
  baseAgi: number;
  baseInt: number;
  strGain: number;
  agiGain: number;
  intGain: number;
  complexity: number | null;
  attackRange: number | null;
  moveSpeed: number | null;
  armor: number | null;
  damageMin: number | null;
  damageMax: number | null;
  attackRate: number | null;
  attackPoint: number | null;
  baseHealth: number | null;
  healthRegen: number | null;
  baseMana: number | null;
  baseMagicResistance: number | null;
  rawConstants: unknown;
}

export interface NormalizedSpecialValue {
  name: string;
  heading: string;
  values: number[];
  isPercentage: boolean;
  bonuses: ValveBonus[];
  scepterValues: number[];
  shardValues: number[];
  facetBonus: ValveSpecialValue["facet_bonus"] | null;
  requiredFacet: string | null;
}

export interface NormalizedAbility {
  id: number;
  abilityKey: string;
  displayName: string;
  abilityType: string;
  isInnate: boolean;
  hasScepter: boolean;
  hasShard: boolean;
  maxLevel: number;
  damageType: string | null;
  sortOrder: number;
  talentTier: number | null;
  talentLevel: number | null;
  linkedAbilityKey: string | null;
  specialValues: NormalizedSpecialValue[];
  rawData: unknown;
}

export interface TalentBonusRef {
  abilityKey: string | null;
  specialValue: string;
  value: number;
  operation: number;
}

export interface NormalizedTalent {
  id: number;
  abilityKey: string;
  displayName: string;
  sortOrder: number;
  talentTier: number;
  talentLevel: number;
  linkedAbilityKey: string | null;
  specialValues: {
    bonusRefs: TalentBonusRef[];
    ownValues: NormalizedSpecialValue[];
  };
  rawData: unknown;
}

const PRIMARY_ATTR = ["STR", "AGI", "INT", "UNIVERSAL"];

const DAMAGE_TYPE: Record<number, string | null> = {
  0: null,
  1: "Physical",
  2: "Magical",
  3: "Pure",
  4: "Pure",
};

export function mapPrimaryAttr(value: number): string {
  return PRIMARY_ATTR[value] ?? "UNKNOWN";
}

export function mapAttackType(
  attackCapability: number,
  fallback?: string,
): string {
  if (attackCapability === 1) return "Melee";
  if (attackCapability === 2) return "Ranged";
  return fallback ?? "Unknown";
}

export function mapDamageType(value: number): string | null {
  return DAMAGE_TYPE[value] ?? null;
}

export function mapAbilityType(ability: ValveAbility): string {
  if (ability.ability_is_innate) return "Innate";
  if (ability.type === 1) return "Ultimate";
  const behavior = Number(ability.behavior);
  if (Number.isFinite(behavior) && (behavior & 2) !== 0) return "Passive";
  return "Active";
}

export function normalizeSpecialValues(
  values: ValveSpecialValue[] | undefined,
): NormalizedSpecialValue[] {
  return (values ?? []).map((value) => ({
    name: value.name,
    heading: value.heading_loc ?? "",
    values: value.values_float ?? [],
    isPercentage: Boolean(value.is_percentage),
    bonuses: value.bonuses ?? [],
    scepterValues: value.values_scepter ?? [],
    shardValues: value.values_shard ?? [],
    facetBonus: value.facet_bonus ?? null,
    requiredFacet: value.required_facet || null,
  }));
}

export function normalizeHero(
  valve: ValveHero,
  opendota: OpenDotaHero | undefined,
): NormalizedHero {
  return {
    id: valve.id,
    name: valve.name,
    localizedName: valve.name_loc,
    primaryAttr: mapPrimaryAttr(valve.primary_attr),
    attackType: mapAttackType(valve.attack_capability, opendota?.attack_type),
    roles: opendota?.roles ?? [],
    baseStr: valve.str_base ?? opendota?.base_str ?? 0,
    baseAgi: valve.agi_base ?? opendota?.base_agi ?? 0,
    baseInt: valve.int_base ?? opendota?.base_int ?? 0,
    strGain: valve.str_gain ?? opendota?.str_gain ?? 0,
    agiGain: valve.agi_gain ?? opendota?.agi_gain ?? 0,
    intGain: valve.int_gain ?? opendota?.int_gain ?? 0,
    complexity: valve.complexity ?? null,
    attackRange: valve.attack_range ?? null,
    moveSpeed: valve.movement_speed ?? null,
    armor: valve.armor ?? null,
    damageMin: valve.damage_min ?? null,
    damageMax: valve.damage_max ?? null,
    attackRate: valve.attack_rate ?? null,
    attackPoint: opendota?.attack_point ?? null,
    baseHealth: valve.max_health ?? null,
    healthRegen: valve.health_regen ?? opendota?.base_health_regen ?? null,
    baseMana: valve.max_mana ?? null,
    baseMagicResistance: valve.magic_resistance ?? null,
    rawConstants: {
      valve,
      opendota: opendota ?? null,
    },
  };
}

export function normalizeAbilities(valve: ValveHero): NormalizedAbility[] {
  return valve.abilities.map((ability, index) => ({
    id: ability.id,
    abilityKey: ability.name,
    displayName: ability.name_loc,
    abilityType: mapAbilityType(ability),
    isInnate: Boolean(ability.ability_is_innate),
    hasScepter: Boolean(ability.ability_has_scepter),
    hasShard: Boolean(ability.ability_has_shard),
    maxLevel: ability.max_level ?? 1,
    damageType: mapDamageType(ability.damage),
    sortOrder: index,
    talentTier: null,
    talentLevel: null,
    linkedAbilityKey: null,
    specialValues: normalizeSpecialValues(ability.special_values),
    rawData: ability,
  }));
}

function formatBonusValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

function cleanTalentName(nameLoc: string, refs: TalentBonusRef[]): string {
  let text = nameLoc;
  for (const ref of refs) {
    text = text.replaceAll(
      `{s:bonus_${ref.specialValue}}`,
      formatBonusValue(ref.value),
    );
    text = text.replaceAll(`{s:${ref.specialValue}}`, formatBonusValue(ref.value));
  }
  return text.replace(/\{s:[^}]+\}/g, "?");
}

export function normalizeTalents(
  valve: ValveHero,
  abilities: NormalizedAbility[],
): NormalizedTalent[] {
  return (valve.talents ?? []).map((talent: ValveTalent, index: number) => {
    const tier = Math.floor(index / 2) + 1;
    const level = 10 + (tier - 1) * 5;
    const ownValues = normalizeSpecialValues(talent.special_values);
    const ownRefs: TalentBonusRef[] = ownValues.flatMap((value) =>
      value.values.map((item) => ({
        abilityKey: null,
        specialValue: value.name,
        value: item,
        operation: 0,
      })),
    );
    const abilityRefs: TalentBonusRef[] = abilities.flatMap((ability) =>
      ability.specialValues.flatMap((value) =>
        value.bonuses
          .filter((bonus) => bonus.name === talent.name)
          .map((bonus) => ({
            abilityKey: ability.abilityKey,
            specialValue: value.name,
            value: bonus.value,
            operation: bonus.operation,
          })),
      ),
    );
    const refs = [...ownRefs, ...abilityRefs];

    return {
      id: talent.id,
      abilityKey: talent.name,
      displayName: cleanTalentName(talent.name_loc, refs),
      sortOrder: 100 + index,
      talentTier: tier,
      talentLevel: level,
      linkedAbilityKey: abilityRefs[0]?.abilityKey ?? null,
      specialValues: {
        bonusRefs: refs,
        ownValues,
      },
      rawData: talent,
    };
  });
}

export function normalizeHeroBundle(
  valve: ValveHero,
  opendota: OpenDotaHero | undefined,
): {
  hero: NormalizedHero;
  abilities: NormalizedAbility[];
  talents: NormalizedTalent[];
} {
  const abilities = normalizeAbilities(valve);
  return {
    hero: normalizeHero(valve, opendota),
    abilities,
    talents: normalizeTalents(valve, abilities),
  };
}
