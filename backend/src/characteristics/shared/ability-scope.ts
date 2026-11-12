import type { AbilityData } from "../types";

export function isAghanimGranted(ability: AbilityData): boolean {
  if (!ability.rawData || typeof ability.rawData !== "object") return false;
  if (Array.isArray(ability.rawData)) return false;
  const raw = ability.rawData as Record<string, unknown>;
  return Boolean(
    raw.ability_is_granted_by_scepter || raw.ability_is_granted_by_shard,
  );
}
