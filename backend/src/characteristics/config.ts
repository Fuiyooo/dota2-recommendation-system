import type { CharacteristicName } from "./types";

export const CONFIG_VERSION = "m2-v24";

export const TARGET = {
  heroLevel: 30,
  attackWindowSeconds: 10,
  targetHp: 2000,
  targetMana: 1000,
  targetArmor: 0,
  targetMagicResistance: 0,
  movementSpeedCap: 550,
  attackSpeedCap: 700,
  hpBase: 120,
  hpPerStrength: 22,
  manaBase: 75,
  manaPerIntelligence: 12,
  armorPerAgility: 1 / 6,
};

export const INDICATORS: Record<
  CharacteristicName,
  Array<{ key: string; label: string; unit: string }>
> = {
  damage: [
    { key: "physicalDamage", label: "Physical Damage", unit: "damage" },
    { key: "magicDamage", label: "Magic Damage", unit: "damage" },
    { key: "pureDamage", label: "Pure Damage", unit: "damage" },
  ],
  durability: [
    { key: "maxHp", label: "Maximum HP", unit: "HP" },
    { key: "armor", label: "Armor", unit: "armor" },
    { key: "magicResistance", label: "Magic Resistance", unit: "%" },
  ],
  crowdControl: [
    { key: "disableDuration", label: "Disable Duration", unit: "seconds" },
    { key: "aoe", label: "AoE / Coverage", unit: "radius" },
    { key: "castRange", label: "Cast Range", unit: "range" },
  ],
  mobility: [
    { key: "movementSpeed", label: "Movement Speed", unit: "speed" },
    {
      key: "mobilityDistance",
      label: "Blink / Dash Distance",
      unit: "distance",
    },
  ],
};

export const INTERNAL_WEIGHTS: Record<CharacteristicName, Record<string, number>> = {
  damage: {
    physicalDamage: 0.4,
    magicDamage: 0.4,
    pureDamage: 0.2,
  },
  durability: {
    maxHp: 0.5,
    armor: 0.25,
    magicResistance: 0.25,
  },
  crowdControl: {
    disableDuration: 0.5,
    aoe: 0.25,
    castRange: 0.25,
  },
  mobility: {
    movementSpeed: 0.4,
    mobilityDistance: 0.6,
  },
};

export const SAW_DEFAULT_WEIGHTS: Record<CharacteristicName, number> = {
  damage: 0.25,
  durability: 0.25,
  crowdControl: 0.25,
  mobility: 0.25,
};

export const CHARACTERISTIC_LABELS: Record<CharacteristicName, string> = {
  damage: "Damage",
  durability: "Durability",
  crowdControl: "Crowd Control",
  mobility: "Mobility / Escape",
};

export function scoreFromPercentile(percentile: number): number {
  if (percentile <= 0) return 1;
  return Math.min(10, Math.ceil(percentile / 10));
}

export function normalizeWeights(
  weights: Partial<Record<CharacteristicName, number>>,
): Record<CharacteristicName, number> {
  const keys: CharacteristicName[] = [
    "damage",
    "durability",
    "crowdControl",
    "mobility",
  ];
  const cleaned = keys.map((key) => {
    const value = Number(weights[key] ?? 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  });
  const total = cleaned.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return { ...SAW_DEFAULT_WEIGHTS };
  return Object.fromEntries(
    keys.map((key, index) => [key, cleaned[index] / total]),
  ) as Record<CharacteristicName, number>;
}
