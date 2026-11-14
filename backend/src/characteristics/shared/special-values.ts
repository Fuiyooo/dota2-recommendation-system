import type { AbilityData } from "../types";

export interface ParsedSpecialValue {
  name: string;
  heading: string;
  values: number[];
  isPercentage: boolean;
  bonuses: Array<{ name: string; value: number; operation: number }>;
  scepterValues: number[];
  shardValues: number[];
}

export interface TalentBonusRef {
  abilityKey: string | null;
  specialValue: string;
  value: number;
  operation: number;
}

interface TalentSpecialValues {
  bonusRefs?: TalentBonusRef[];
  ownValues?: ParsedSpecialValue[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Field dengan nama scepter atau aghs_shard hanya berisi nilai item.
 * Nama shard_ biasa tidak disaring karena Valve juga memakainya untuk
 * ability dasar seperti Ice Shards Tusk.
 */
export function isUpgradeOnlyValue(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes("scepter") || lower.startsWith("aghs_shard");
}

export function specialValuesOf(ability: AbilityData): ParsedSpecialValue[] {
  if (Array.isArray(ability.specialValues)) {
    return ability.specialValues
      .filter(isRecord)
      .filter((value) => !isUpgradeOnlyValue(String(value.name ?? "")))
      .map((value) => ({
        name: String(value.name ?? ""),
        heading: String(value.heading ?? ""),
        values: Array.isArray(value.values)
          ? value.values.filter((item): item is number => typeof item === "number")
          : [],
        isPercentage: Boolean(value.isPercentage),
        bonuses: Array.isArray(value.bonuses)
          ? value.bonuses.filter(isRecord).map((bonus) => ({
              name: String(bonus.name ?? ""),
              value: Number(bonus.value ?? 0),
              operation: Number(bonus.operation ?? 0),
            }))
          : [],
        scepterValues: Array.isArray(value.scepterValues)
          ? value.scepterValues.filter(
              (item): item is number => typeof item === "number",
            )
          : [],
        shardValues: Array.isArray(value.shardValues)
          ? value.shardValues.filter(
              (item): item is number => typeof item === "number",
            )
          : [],
      }));
  }

  return [];
}

export function talentRefsOf(ability: AbilityData): TalentBonusRef[] {
  if (!isRecord(ability.specialValues)) return [];
  const values = ability.specialValues as TalentSpecialValues;
  if (!Array.isArray(values.bonusRefs)) return [];
  return values.bonusRefs.filter(isRecord).map((ref) => ({
    abilityKey:
      typeof ref.abilityKey === "string" ? ref.abilityKey : null,
    specialValue: String(ref.specialValue ?? ""),
    value: Number(ref.value ?? 0),
    operation: Number(ref.operation ?? 0),
  }));
}

export function descriptionOf(ability: AbilityData): string {
  if (!isRecord(ability.rawData)) return "";
  const description = ability.rawData.desc_loc;
  const notes = ability.rawData.notes_loc;
  const parts: string[] = [];
  if (typeof description === "string") parts.push(description);
  if (Array.isArray(notes)) {
    for (const note of notes) {
      if (typeof note === "string") parts.push(note);
    }
  }
  return parts.join(" ");
}

export function maxValue(value: ParsedSpecialValue): number {
  if (value.values.length === 0) return 0;
  return value.values[value.values.length - 1];
}

export function findValue(
  ability: AbilityData,
  names: string[],
): ParsedSpecialValue | undefined {
  const values = specialValuesOf(ability);
  for (const name of names) {
    const match = values.find((value) => value.name === name);
    if (match) return match;
  }
  return undefined;
}

export function findByKeyword(
  ability: AbilityData,
  keywords: string[],
): ParsedSpecialValue[] {
  return specialValuesOf(ability).filter((value) => {
    const haystack = `${value.name} ${value.heading}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword));
  });
}

export function talentAdjustedValue(
  baseValue: number,
  abilityKey: string,
  valueName: string,
  selectedTalents: AbilityData[],
): number {
  let flat = 0;
  let percentage = 0;
  for (const talent of selectedTalents) {
    for (const ref of talentRefsOf(talent)) {
      if (ref.abilityKey !== abilityKey || ref.specialValue !== valueName) {
        continue;
      }
      if (ref.operation === 3) percentage += ref.value;
      else if (ref.operation === 0) flat += ref.value;
    }
  }
  return (baseValue + flat) * (1 + percentage / 100);
}

export function heroTalentBonus(
  selectedTalents: AbilityData[],
  pattern: RegExp,
): number {
  let total = 0;
  for (const talent of selectedTalents) {
    if (!pattern.test(talent.displayName)) continue;
    for (const ref of talentRefsOf(talent)) {
      if (ref.abilityKey === null) {
        total += ref.value;
      }
    }
  }
  return total;
}

export function inferUnit(
  name: string,
  isPercentage: boolean,
  heading: string,
): "percent" | "seconds" | "mana" | "flat" {
  const haystack = `${name} ${heading}`.toLowerCase();
  if (
    isPercentage ||
    haystack.includes("%") ||
    haystack.includes("percent") ||
    haystack.includes("pct") ||
    haystack.includes("percentage")
  ) {
    return "percent";
  }
  if (
    haystack.includes("duration") ||
    haystack.includes("delay") ||
    haystack.includes("interval") ||
    haystack.includes("cooldown")
  ) {
    return "seconds";
  }
  if (haystack.includes("mana")) return "mana";
  return "flat";
}

export function abilityHasAnyKeyword(
  ability: AbilityData,
  keywords: string[],
): boolean {
  const haystack = `${ability.abilityKey} ${ability.displayName} ${descriptionOf(
    ability,
  )}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
}

const ATTACK_MODIFIERS = new Set([
  "antimage_mana_break",
  "juggernaut_blade_dance",
  "enchantress_impetus",
  "huskar_burning_spear",
  "jakiro_liquid_fire",
  "winter_wyvern_arctic_burn",
  "muerta_gunslinger",
]);

/**
 * Daftar putih attack modifier yang menempel pada serangan.
 * Ability active seperti Breathe Fire, Power Cogs, Supernova, God's Rebuke,
 * dan Lil' Shredder tidak termasuk, karena dihitung lewat ekstraksi damage
 * biasa atau handler khusus.
 */
export function isAttackModifier(ability: AbilityData): boolean {
  return ATTACK_MODIFIERS.has(ability.abilityKey);
}
