import type { Ability, SpecialValue } from "../api/types";

const NUMBER_FORMATTER = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

const HIDDEN_SPECIAL_VALUES = new Set([
  "model_scale",
  "health_bar_offset",
  "flying_movement",
  "scepter_bonus_levels",
]);

const SPECIAL_VALUE_LABELS: Record<string, string> = {
  regen_and_armor_multiplier_during_dragon_form:
    "Dragon Form Regen/Armor Multiplier",
  magic_resistance: "Magic Resistance",
  AbilityManaCost: "Mana Cost",
  AbilityCooldown: "Cooldown",
  health_regen: "Bonus HP Regen",
  armor: "Bonus Armor",
};

const PERCENTAGE_VALUES = new Set([
  "regen_and_armor_multiplier_during_dragon_form",
  "magic_resistance",
]);

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'");
}

export function stripAbilityHtml(text: string): string {
  const withBreaks = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ");

  return decodeEntities(withBreaks.replace(/<[^>]*>/g, ""))
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function specialValueMap(ability: Ability): Map<string, number[]> {
  const values = new Map<string, number[]>();
  if (!Array.isArray(ability.specialValues)) return values;

  for (const value of ability.specialValues) {
    if (!value || typeof value.name !== "string") continue;
    if (Array.isArray(value.values) && value.values.length > 0) {
      values.set(value.name, value.values);
    }
  }

  return values;
}

function formatNumber(value: number): string {
  return NUMBER_FORMATTER.format(value);
}

export function formatAbilityDescription(ability: Ability): string {
  const description = ability.rawData?.desc_loc;
  if (typeof description !== "string" || !description.trim()) return "";

  const values = specialValueMap(ability);
  const replaced = description.replace(
    /%([a-zA-Z0-9_]+)%/g,
    (match, key: string) => {
      const list = values.get(key);
      if (!list) return match;
      return list.map(formatNumber).join(" / ");
    },
  );

  return stripAbilityHtml(replaced.replace(/%%/g, "%"));
}

export function visibleSpecialValues(ability: Ability): SpecialValue[] {
  if (!Array.isArray(ability.specialValues)) return [];

  return ability.specialValues.filter(
    (value) =>
      value &&
      typeof value.name === "string" &&
      !HIDDEN_SPECIAL_VALUES.has(value.name) &&
      Array.isArray(value.values) &&
      value.values.length > 0,
  );
}

function humanizeValueName(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatSpecialValueLabel(value: SpecialValue): string {
  const heading = stripAbilityHtml(value.heading ?? "")
    .replace(/:+$/, "")
    .trim();

  if (heading) return `${heading}:`;

  const label = SPECIAL_VALUE_LABELS[value.name] ?? humanizeValueName(value.name);
  return `${label}:`;
}

export function isPercentageSpecialValue(value: SpecialValue): boolean {
  return value.isPercentage || PERCENTAGE_VALUES.has(value.name);
}
