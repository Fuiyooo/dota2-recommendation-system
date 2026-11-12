import { TARGET } from "../config";
import { abilityAttackSpeedBonus } from "./attack-speed-config";
import type { AbilityData, HeroData } from "../types";
import {
  abilityHasAnyKeyword,
  findByKeyword,
  findValue,
  heroTalentBonus,
  maxValue,
  talentRefsOf,
} from "./special-values";
import { DURABILITY_ABILITY_RULES } from "../durability/durability-ability-config";

export interface AttributesResult {
  strength: number;
  agility: number;
  intelligence: number;
  damageMin: number;
  damageMax: number;
  attackSpeedBonus: number;
  abilityAttackSpeed: number;
  attackSpeedTotal: number;
  bat: number;
  attackPoint: number;
  attackPointSource: "opendota" | "fallback";
  attacksPerSecond: number;
  attackInterval: number;
  attacksInWindow: number;
  maxHp: number;
  maxMana: number;
  healthRegen: number;
  armor: number;
  magicResistance: number;
  movementSpeed: number;
  bonusDamage: number;
  bonusHp: number;
  bonusArmor: number;
  bonusMagicResistance: number;
  bonusMovementSpeed: number;
  notes: string[];
}

function primaryGrowth(hero: HeroData): number {
  if (hero.primaryAttr === "STR") return hero.strGain;
  if (hero.primaryAttr === "AGI") return hero.agiGain;
  if (hero.primaryAttr === "INT") return hero.intGain;
  return 0;
}

function abilityValueWithTalent(
  ability: AbilityData,
  name: string,
  talents: AbilityData[],
): number {
  const value = findValue(ability, [name]);
  if (!value) return 0;

  let additive = 0;
  let percentage = 0;
  for (const talent of talents) {
    for (const ref of talentRefsOf(talent)) {
      if (ref.abilityKey !== ability.abilityKey || ref.specialValue !== name) {
        continue;
      }
      if (ref.operation === 3) percentage += ref.value;
      else if (ref.operation === 0) additive += ref.value;
    }
  }

  return (maxValue(value) + additive) * (1 + percentage / 100);
}

function abilityDurabilityBonuses(
  hero: HeroData,
  talents: AbilityData[],
): {
  armor: number;
  hpRegen: number;
  hpFlat: number;
  magicResistance: number;
} {
  let armor = 0;
  let hpRegen = 0;
  let hpFlat = 0;
  let magicResistance = 0;

  for (const ability of hero.abilities) {
    if (ability.abilityType === "Talent") continue;
    const rule = DURABILITY_ABILITY_RULES[ability.abilityKey];
    if (!rule) continue;
    for (const field of rule.armorFields ?? []) {
      armor += abilityValueWithTalent(ability, field, talents);
    }
    for (const field of rule.hpRegenFields ?? []) {
      hpRegen += abilityValueWithTalent(ability, field, talents);
    }
    for (const field of rule.magicResistanceFields ?? []) {
      magicResistance += abilityValueWithTalent(ability, field, talents);
    }
    hpFlat += rule.fixedHp ?? 0;
    armor += rule.fixedArmor ?? 0;
  }

  return { armor, hpRegen, hpFlat, magicResistance };
}

function abilityMovementSpeedBonus(hero: HeroData): number {
  const base = hero.moveSpeed ?? 0;
  let bonus = 0;
  for (const ability of hero.abilities) {
    if (ability.abilityType === "Talent") continue;
    if (ability.abilityKey === "tiny_grow") {
      const value = findValue(ability, ["move_speed"]);
      if (value) bonus += maxValue(value);
    } else if (ability.abilityKey === "windrunner_windrun") {
      const value = findValue(ability, ["movespeed_bonus_pct"]);
      if (value) bonus += base * (maxValue(value) / 100) * 0.6;
    } else if (ability.abilityKey === "hoodwink_scurry") {
      const value = findValue(ability, ["movement_speed_pct"]);
      if (value) bonus += base * (maxValue(value) / 100);
    }
  }
  return bonus;
}

function heroLevelDamageTalentBonus(talents: AbilityData[]): number {
  let total = 0;
  for (const talent of talents) {
    const name = talent.displayName.toLowerCase();
    if (!name.includes("damage")) continue;
    if (
      name.includes("spell") ||
      name.includes("magic") ||
      name.includes("ability") ||
      name.includes("cooldown")
    ) {
      continue;
    }
    for (const ref of talentRefsOf(talent)) {
      if (ref.abilityKey === null) total += ref.value;
    }
  }
  return total;
}

function attackSpeedTalentBonus(talents: AbilityData[]): number {
  let total = 0;
  for (const talent of talents) {
    const name = talent.displayName.toLowerCase();
    if (!name.includes("attack speed") && !name.includes("attack")) continue;
    for (const ref of talentRefsOf(talent)) {
      const key = ref.abilityKey ?? "";
      if (key.includes("attack_speed") || name.includes("attack speed")) {
        total += ref.value;
      }
    }
  }
  return total;
}

export function calculateAttributes(
  hero: HeroData,
  talents: AbilityData[],
): AttributesResult {
  const strength = hero.baseStr + hero.strGain * (TARGET.heroLevel - 1);
  const agility = hero.baseAgi + hero.agiGain * (TARGET.heroLevel - 1);
  const intelligence = hero.baseInt + hero.intGain * (TARGET.heroLevel - 1);
  const abilityBonuses = abilityDurabilityBonuses(hero, talents);
  const notes: string[] = [];

  let damageMin = hero.damageMin ?? 0;
  let damageMax = hero.damageMax ?? 0;

  if (hero.primaryAttr === "UNIVERSAL") {
    const universalBonus = 0.7 * (strength + agility + intelligence);
    damageMin += universalBonus;
    damageMax += universalBonus;
  } else {
    const growthBonus = primaryGrowth(hero) * (TARGET.heroLevel - 1);
    damageMin += growthBonus;
    damageMax += growthBonus;
  }

  const grow = hero.abilities.find(
    (ability) =>
      ability.abilityKey === "tiny_grow" && ability.abilityType !== "Talent",
  );
  if (grow) {
    const value = findValue(grow, ["bonus_damage"]);
    if (value) {
      const bonus = maxValue(value);
      damageMin += bonus;
      damageMax += bonus;
    }
  }

  const bonusDamage = heroLevelDamageTalentBonus(talents);
  damageMin += bonusDamage;
  damageMax += bonusDamage;

  const abilityAttackSpeed = abilityAttackSpeedBonus(hero.abilities);
  const attackSpeedBonus =
    agility + attackSpeedTalentBonus(talents) + abilityAttackSpeed;
  const attackSpeedTotal = Math.min(
    TARGET.attackSpeedCap,
    100 + attackSpeedBonus,
  );
  const bat = hero.attackRate ?? 1.7;
  if (hero.attackRate === null) {
    notes.push("BAT tidak tersedia, memakai 1,7 detik.");
  }

  const attacksPerSecond =
    bat > 0 ? attackSpeedTotal / (100 * bat) : 0;
  const attackInterval =
    attacksPerSecond > 0 ? 1 / attacksPerSecond : 0;
  const attackPoint = hero.attackPoint ?? 0.3;
  const attackPointSource = hero.attackPoint === null ? "fallback" : "opendota";
  if (hero.attackPoint === null) {
    notes.push("attack_point tidak tersedia, memakai 0,3 detik.");
  }

  let attacksInWindow = 0;
  if (attackInterval > 0) {
    let start = 0;
    while (start + attackPoint <= TARGET.attackWindowSeconds + 1e-9) {
      attacksInWindow += 1;
      start += attackInterval;
    }
  }

  const baseHealth =
    hero.baseHealth ??
    TARGET.hpBase + TARGET.hpPerStrength * hero.baseStr;
  const baseMana =
    hero.baseMana ??
    TARGET.manaBase + TARGET.manaPerIntelligence * hero.baseInt;
  const bonusHp =
    heroTalentBonus(talents, /health|hp/i) + abilityBonuses.hpFlat;
  const bonusHpRegen = heroTalentBonus(talents, /health regen|hp regen/i);
  const bonusArmor =
    heroTalentBonus(talents, /armor/i) + abilityBonuses.armor;
  const bonusMagicResistance =
    heroTalentBonus(talents, /magic resist|magic resistance/i) +
    abilityBonuses.magicResistance;
  const bonusMovementSpeed =
    heroTalentBonus(talents, /movement speed|move speed/i) +
    abilityMovementSpeedBonus(hero);

  const maxHp =
    baseHealth + TARGET.hpPerStrength * (strength - hero.baseStr) + bonusHp;
  const maxMana =
    baseMana +
    TARGET.manaPerIntelligence * (intelligence - hero.baseInt);
  const armor =
    (hero.armor ?? 0) +
    TARGET.armorPerAgility * (agility - hero.baseAgi) +
    bonusArmor;
  const healthRegen =
    (hero.healthRegen ?? 0) +
    0.1 * (strength - hero.baseStr) +
    bonusHpRegen +
    abilityBonuses.hpRegen;
  const baseMagicResistance =
    (hero.baseMagicResistance ?? 25) + 0.1 * intelligence;
  const magicResistance = Math.min(
    100,
    100 *
      (1 -
        (1 - baseMagicResistance / 100) *
          (1 - bonusMagicResistance / 100)),
  );
  const movementSpeed = Math.min(
    TARGET.movementSpeedCap,
    (hero.moveSpeed ?? 0) + bonusMovementSpeed,
  );

  for (const ability of hero.abilities) {
    if (ability.abilityType === "Talent") continue;
    if (DURABILITY_ABILITY_RULES[ability.abilityKey]) continue;
    if (
      abilityHasAnyKeyword(ability, [
        "bonus health",
        "max health",
        "bonus armor",
        "magic resistance",
      ])
    ) {
      notes.push(
        `${ability.displayName}: bonus durability dari ability perlu verifikasi.`,
      );
    }
  }

  return {
    strength,
    agility,
    intelligence,
    damageMin,
    damageMax,
    attackSpeedBonus,
    abilityAttackSpeed,
    attackSpeedTotal,
    bat,
    attackPoint,
    attackPointSource,
    attacksPerSecond,
    attackInterval,
    attacksInWindow,
    maxHp,
    maxMana,
    healthRegen,
    armor,
    magicResistance,
    movementSpeed,
    bonusDamage,
    bonusHp,
    bonusArmor,
    bonusMagicResistance,
    bonusMovementSpeed,
    notes,
  };
}
