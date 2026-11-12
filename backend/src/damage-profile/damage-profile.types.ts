export type DamageType = "PHYSICAL" | "MAGICAL" | "PURE";
export type DamageSecondary = DamageType | "NONE";

export const DAMAGE_TYPES: DamageType[] = ["PHYSICAL", "MAGICAL", "PURE"];
export const SECONDARY_TYPES: DamageSecondary[] = [
  "PHYSICAL",
  "MAGICAL",
  "PURE",
  "NONE",
];

export interface DamageProfile {
  main: DamageType;
  secondary: DamageSecondary;
}

export const MAIN_WEIGHT = 0.7;
export const SECONDARY_WEIGHT = 0.3;

export const DEFAULT_DAMAGE_PROFILE: DamageProfile = {
  main: "PHYSICAL",
  secondary: "MAGICAL",
};

const INDICATOR_BY_TYPE: Record<DamageType, string> = {
  PHYSICAL: "physicalDamage",
  MAGICAL: "magicDamage",
  PURE: "pureDamage",
};

export function damageWeights(
  profile: DamageProfile,
): Record<string, number> {
  const weights: Record<string, number> = {
    physicalDamage: 0,
    magicDamage: 0,
    pureDamage: 0,
  };

  if (profile.secondary === "NONE") {
    // Hero satu tipe damage memakai bobot main penuh.
    weights[INDICATOR_BY_TYPE[profile.main]] = MAIN_WEIGHT + SECONDARY_WEIGHT;
    return weights;
  }

  weights[INDICATOR_BY_TYPE[profile.main]] += MAIN_WEIGHT;
  weights[INDICATOR_BY_TYPE[profile.secondary]] += SECONDARY_WEIGHT;
  return weights;
}

export function countsBasicAttack(profile: DamageProfile): boolean {
  return profile.main === "PHYSICAL" || profile.secondary === "PHYSICAL";
}

export function isValidSecondary(
  main: string,
  secondary: string,
): boolean {
  if (!DAMAGE_TYPES.includes(main as DamageType)) return false;
  if (!SECONDARY_TYPES.includes(secondary as DamageSecondary)) return false;
  if (secondary === "NONE") return true;
  return secondary !== main;
}

export function toDamageProfile(
  main: string,
  secondary: string,
): DamageProfile {
  return {
    main: main as DamageType,
    secondary: secondary as DamageSecondary,
  };
}
