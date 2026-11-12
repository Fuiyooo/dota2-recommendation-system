import type {
  AbilityData,
  CalculationStatus,
  HeroData,
} from "../types";
import type { AttributesResult } from "../shared/attribute-calculator";
import { abilityHasAnyKeyword } from "../shared/special-values";
import {
  DURABILITY_ABILITY_RULES,
  DURABILITY_EXCLUDED,
} from "./durability-ability-config";
import { findValue, maxValue } from "../shared/special-values";

export interface DurabilityCalculation {
  maxHp: number;
  healthRegen: number;
  armor: number;
  magicResistance: number;
  status: CalculationStatus;
  detail: Record<string, unknown>;
}

export function calculateDurability(
  hero: HeroData,
  attributes: AttributesResult,
  talents: AbilityData[],
): DurabilityCalculation {
  const unhandled: string[] = [];

  for (const ability of hero.abilities) {
    if (ability.abilityType === "Talent") continue;
    if (DURABILITY_ABILITY_RULES[ability.abilityKey]) continue;
    if (DURABILITY_EXCLUDED.has(ability.abilityKey)) continue;
    if (
      abilityHasAnyKeyword(ability, [
        "bonus health",
        "max health",
        "health bonus",
        "bonus armor",
        "armor bonus",
        "magic resistance",
        "magic resist",
        "damage reduction",
        "damage block",
        "evasion",
      ])
    ) {
      unhandled.push(`${ability.displayName}: bonus durability perlu diverifikasi.`);
    }
  }

  const detailOnly: string[] = [];
  if (
    hero.abilities.some(
      (ability) => ability.abilityKey === "abyssal_underlord_atrophy_aura",
    )
  ) {
    detailOnly.push(
      "Atrophy Aura: hanya informasi, tidak masuk skor durability.",
    );
  }
  if (
    hero.abilities.some(
      (ability) => ability.abilityKey === "omniknight_martyr",
    )
  ) {
    detailOnly.push(
      "Repel: buff temporer, tidak masuk skor durability.",
    );
  }
  if (
    hero.abilities.some(
      (ability) => ability.abilityKey === "ringmaster_the_box",
    )
  ) {
    detailOnly.push(
      "Escape Act: box temporer dan untargetable, tidak masuk skor durability.",
    );
  }

  const immaterial = hero.abilities.find(
    (ability) => ability.abilityKey === "phantom_assassin_immaterial",
  );
  let immaterialEvasion = 0;
  let immaterialEhp = 0;
  if (immaterial) {
    const value = findValue(immaterial, ["evasion"]);
    if (value) {
      const talentBonus = value.bonuses.reduce(
        (sum, bonus) => sum + bonus.value,
        0,
      );
      immaterialEvasion = Math.min(
        0.75,
        (maxValue(value) + talentBonus) / 100,
      );
      immaterialEhp =
        attributes.maxHp / (1 - immaterialEvasion) - attributes.maxHp;
    }
  }

  const eelskin = hero.abilities.find(
    (ability) => ability.abilityKey === "naga_siren_eelskin",
  );
  let eelskinEvasion = 0;
  let evasionEhp = 0;
  if (eelskin) {
    const perNaga = findValue(eelskin, ["evasion_per_naga"]);
    if (perNaga) {
      eelskinEvasion = Math.min(0.75, (maxValue(perNaga) / 100) * 3);
      evasionEhp =
        attributes.maxHp / (1 - eelskinEvasion) - attributes.maxHp;
    }
  }

  const manaShield = hero.abilities.find(
    (ability) => ability.abilityKey === "medusa_mana_shield",
  );
  let manaShieldEhp = 0;
  if (manaShield) {
    const damagePerMana = findValue(manaShield, ["damage_per_mana"]);
    if (damagePerMana) {
      manaShieldEhp = attributes.maxMana * maxValue(damagePerMana);
    }
  }

  return {
    maxHp:
      attributes.maxHp + manaShieldEhp + evasionEhp + immaterialEhp,
    healthRegen: attributes.healthRegen,
    armor: attributes.armor,
    magicResistance: Math.min(100, attributes.magicResistance),
    status: unhandled.length > 0 ? "PARTIAL" : "SUPPORTED",
    detail: {
      strength: attributes.strength,
      baseHp: hero.baseHealth,
      bonusHp: attributes.bonusHp,
      agility: attributes.agility,
      baseArmor: hero.armor,
      bonusArmor: attributes.bonusArmor,
      baseMagicResistance: hero.baseMagicResistance,
      healthRegen: attributes.healthRegen,
      manaShieldEhp,
      eelskinEvasion,
      evasionEhp,
      immaterialEvasion,
      immaterialEhp,
      detailOnly,
      bonusMagicResistance: attributes.bonusMagicResistance,
      selectedTalents: talents.map((talent) => talent.displayName),
      unhandled,
    },
  };
}
