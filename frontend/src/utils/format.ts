import type {
  Ability,
  SpecialValue,
  TalentSpecialValues,
} from "../api/types";

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${(value * 100).toFixed(2)}%`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDecimal(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function specialValueList(ability: Ability): SpecialValue[] {
  if (!Array.isArray(ability.specialValues)) return [];
  return ability.specialValues;
}

export function talentValues(ability: Ability): TalentSpecialValues {
  if (
    ability.specialValues &&
    !Array.isArray(ability.specialValues) &&
    typeof ability.specialValues === "object"
  ) {
    return ability.specialValues;
  }
  return {};
}

export function isPercentValue(value: SpecialValue): boolean {
  const text = `${value.name} ${value.heading}`.toLowerCase();
  return (
    value.isPercentage ||
    text.includes("%") ||
    text.includes("percent") ||
    text.includes("pct") ||
    text.includes("percentage")
  );
}

export function trackedDamageValues(ability: Ability): SpecialValue[] {
  return specialValueList(ability)
    .filter(
      (value) =>
        value.values.length > 0 &&
        value.name.toLowerCase().includes("damage"),
    )
    .slice(0, 3);
}
