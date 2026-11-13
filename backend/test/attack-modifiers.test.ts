import { describe, expect, it } from "vitest";
import { calculateDamage } from "../src/characteristics/damage/damage-calculator";
import { isAttackModifier } from "../src/characteristics/shared/special-values";
import type { AttributesResult } from "../src/characteristics/shared/attribute-calculator";
import type { AbilityData, HeroData } from "../src/characteristics/types";

function special(name: string, values: number[]) {
  return {
    name,
    heading: "",
    values,
    isPercentage: false,
    bonuses: [],
    scepterValues: [],
    shardValues: [],
  };
}

function ability(
  abilityKey: string,
  displayName: string,
  damageType: string | null,
  specials: Array<ReturnType<typeof special>>,
): AbilityData {
  return {
    id: 1,
    abilityKey,
    displayName,
    abilityType: "Active",
    isInnate: false,
    maxLevel: 4,
    damageType,
    talentLevel: null,
    linkedAbilityKey: null,
    specialValues: specials,
    rawData: { desc_loc: "" },
    sortOrder: 0,
  };
}

function hero(abilities: AbilityData[]): HeroData {
  return {
    id: 1,
    localizedName: "Test",
    primaryAttr: "UNIVERSAL",
    attackType: "Ranged",
    baseStr: 20,
    baseAgi: 20,
    baseInt: 20,
    strGain: 2,
    agiGain: 2,
    intGain: 2,
    attackRange: 600,
    moveSpeed: 300,
    armor: 0,
    damageMin: 100,
    damageMax: 100,
    attackRate: 1.7,
    attackPoint: 0.5,
    baseHealth: 0,
    baseMana: 0,
    baseMagicResistance: 25,
    abilities,
  };
}

const attributes: AttributesResult = {
  strength: 0,
  agility: 0,
  intelligence: 0,
  damageMin: 100,
  damageMax: 100,
  attackSpeedBonus: 0,
  abilityAttackSpeed: 0,
  attackSpeedTotal: 100,
  bat: 1.7,
  attackPoint: 0.5,
  attackPointSource: "fallback",
  attacksPerSecond: 1,
  attackInterval: 1,
  attacksInWindow: 10,
  maxHp: 0,
  maxMana: 0,
  healthRegen: 0,
  armor: 0,
  magicResistance: 25,
  movementSpeed: 300,
  bonusDamage: 0,
  bonusHp: 0,
  bonusArmor: 0,
  bonusMagicResistance: 0,
  bonusMovementSpeed: 0,
  notes: [],
};

function damage(abilities: AbilityData[]) {
  return calculateDamage(hero(abilities), attributes, [], {
    main: "PHYSICAL",
    secondary: "MAGICAL",
  });
}

describe("attack modifier dipisahkan dari ability active", () => {
  it("Breathe Fire dihitung sebagai magic normal", () => {
    const result = damage([
      ability("dragon_knight_breathe_fire", "Breathe Fire", "Magical", [
        special("damage", [320]),
      ]),
    ]);
    expect(result.magic).toBeCloseTo(320, 6);
    expect(result.detail.unsupported).toEqual([]);
  });

  it("Power Cogs dihitung sebagai magic normal", () => {
    const result = damage([
      ability("rattletrap_power_cogs", "Power Cogs", "Magical", [
        special("damage", [220]),
      ]),
    ]);
    expect(result.magic).toBeCloseTo(220, 6);
  });

  it("Supernova memakai damage_per_sec dikali AbilityDuration", () => {
    const result = damage([
      ability("phoenix_supernova", "Supernova", "Magical", [
        special("damage_per_sec", [110]),
        special("AbilityDuration", [6]),
      ]),
    ]);
    expect(result.magic).toBeCloseTo(660, 6);
  });

  it("Afterburner tidak menambah damage", () => {
    const result = damage([
      ability("gyrocopter_afterburner", "Afterburner", null, [
        special("bonus_movement_speed_per_hit", [1]),
      ]),
    ]);
    expect(result.physical).toBeCloseTo(1000, 6);
    expect(result.magic).toBe(0);
  });

  it("Moon Glaives dilewati", () => {
    const result = damage([
      ability("luna_moon_glaive", "Moon Glaives", null, [
        special("bounces", [6]),
        special("damage_reduction_percent", [35]),
      ]),
    ]);
    expect(result.physical).toBeCloseTo(1000, 6);
    expect(result.detail.unsupported).toEqual([]);
  });
});

describe("handler attack modifier", () => {
  it("Blade Dance menaikkan basic attack 35 persen", () => {
    const result = damage([
      ability("juggernaut_blade_dance", "Blade Dance", null, [
        special("blade_dance_crit_chance", [35]),
        special("blade_dance_crit_mult", [200]),
      ]),
    ]);
    expect(result.physical).toBeCloseTo(1350, 6);
  });

  it("Impetus memakai cast range 575", () => {
    const result = damage([
      ability("enchantress_impetus", "Impetus", "Pure", [
        special("distance_damage_pct", [20]),
      ]),
    ]);
    expect(result.pure).toBeCloseTo(0.2 * 575 * 10, 6);
  });

  it("Burning Spear memakai satu stack", () => {
    const result = damage([
      ability("huskar_burning_spear", "Burning Spear", "Magical", [
        special("burn_damage", [16]),
        special("duration", [9]),
      ]),
    ]);
    expect(result.magic).toBeCloseTo(144, 6);
  });

  it("Liquid Fire memakai satu aplikasi", () => {
    const result = damage([
      ability("jakiro_liquid_fire", "Liquid Fire", "Magical", [
        special("damage", [48]),
        special("tick_rate", [0.5]),
        special("AbilityDuration", [5]),
      ]),
    ]);
    expect(result.magic).toBeCloseTo(480, 6);
  });

  it("Arctic Burn memakai lima serangan", () => {
    const result = damage([
      ability("winter_wyvern_arctic_burn", "Arctic Burn", "Magical", [
        special("percent_damage", [10]),
      ]),
    ]);
    expect(result.magic).toBeCloseTo(2841, 6);
  });

  it("Gunslinger menambah tembakan kedua", () => {
    const result = damage([
      ability("muerta_gunslinger", "Gunslinger", null, [
        special("double_shot_chance", [45]),
      ]),
    ]);
    expect(result.physical).toBeCloseTo(1450, 6);
  });

  it("isAttackModifier hanya untuk daftar putih", () => {
    expect(
      isAttackModifier(
        ability("enchantress_impetus", "Impetus", "Pure", []),
      ),
    ).toBe(true);
    expect(
      isAttackModifier(
        ability("dragon_knight_breathe_fire", "Breathe Fire", "Magical", []),
      ),
    ).toBe(false);
  });
});

describe("handler ability attack", () => {
  it("Lil' Shredder memakai lima attack", () => {
    const result = damage([
      ability("snapfire_lil_shredder", "Lil' Shredder", "Physical", [
        special("damage", [65]),
        special("damage_pct", [35]),
        special("buffed_attacks", [5]),
      ]),
    ]);
    expect(result.physical).toBeCloseTo(1000 + 5 * 100, 6);
  });

  it("God's Rebuke memakai crit terhadap attack damage", () => {
    const result = damage([
      ability("mars_gods_rebuke", "God's Rebuke", "Physical", [
        special("crit_mult", [300]),
        special("bonus_damage_vs_heroes", [20]),
      ]),
    ]);
    expect(result.physical).toBeCloseTo(1000 + 320, 6);
  });

  it("Sleight of Fist memakai satu target", () => {
    const result = damage([
      ability("ember_spirit_sleight_of_fist", "Sleight of Fist", "Physical", [
        special("bonus_hero_damage", [160]),
      ]),
    ]);
    expect(result.physical).toBeCloseTo(1000 + 260, 6);
  });
});
