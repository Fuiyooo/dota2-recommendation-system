import { describe, expect, it } from "vitest";
import { calculateDamage } from "../src/characteristics/damage/damage-calculator";
import { calculateDurability } from "../src/characteristics/durability/durability-calculator";
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
    rawData: { desc_loc: "damage" },
    sortOrder: 0,
  };
}

function hero(abilities: AbilityData[]): HeroData {
  return {
    id: 1,
    localizedName: "Test",
    primaryAttr: "AGI",
    attackType: "Melee",
    baseStr: 20,
    baseAgi: 20,
    baseInt: 20,
    strGain: 2,
    agiGain: 2,
    intGain: 2,
    attackRange: 150,
    moveSpeed: 300,
    armor: 0,
    damageMin: 100,
    damageMax: 100,
    attackRate: 1.7,
    attackPoint: 0.4,
    baseHealth: 2000,
    healthRegen: 0,
    baseMana: 1000,
    baseMagicResistance: 25,
    abilities,
  };
}

const attributes: AttributesResult = {
  strength: 20,
  agility: 20,
  intelligence: 20,
  damageMin: 100,
  damageMax: 100,
  attackSpeedBonus: 0,
  abilityAttackSpeed: 0,
  attackSpeedTotal: 100,
  bat: 1.7,
  attackPoint: 0.4,
  attackPointSource: "fallback",
  attacksPerSecond: 1,
  attackInterval: 1,
  attacksInWindow: 10,
  maxHp: 2000,
  maxMana: 1000,
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

const physicalProfile = { main: "PHYSICAL" as const, secondary: "NONE" as const };
const magicalProfile = { main: "MAGICAL" as const, secondary: "NONE" as const };

describe("handler damage baru", () => {
  it("Aphotic Shield memakai besar shield", () => {
    const damage = calculateDamage(
      hero([
        ability("abaddon_aphotic_shield", "Aphotic Shield", "Magical", [
          special("damage_absorb", [210]),
        ]),
      ]),
      { ...attributes, attacksInWindow: 0 },
      [],
      magicalProfile,
    );
    expect(damage.magic).toBeCloseTo(210, 5);
    expect(damage.detail.unsupported).toEqual([]);
  });

  it("Shuriken Toss memakai bonus_damage", () => {
    const damage = calculateDamage(
      hero([
        ability("bounty_hunter_shuriken_toss", "Shuriken Toss", "Magical", [
          special("bonus_damage", [310]),
        ]),
      ]),
      { ...attributes, attacksInWindow: 0 },
      [],
      magicalProfile,
    );
    expect(damage.magic).toBeCloseTo(310, 5);
  });

  it("Quill Spray memakai base + 7 stack", () => {
    const damage = calculateDamage(
      hero([
        ability("bristleback_quill_spray", "Quill Spray", "Physical", [
          special("quill_base_damage", [85]),
          special("quill_stack_damage", [30]),
        ]),
      ]),
      { ...attributes, attacksInWindow: 0, damageMin: 0, damageMax: 0 },
      [],
      physicalProfile,
    );
    expect(damage.physical).toBeCloseTo(295, 5);
  });

  it("Prickly memberi amp 19,5% ke semua damage", () => {
    const damage = calculateDamage(
      hero([
        ability("bristleback_prickly", "Prickly", "Physical", [
          special("amp_pct", [4.5]),
        ]),
        ability("bristleback_quill_spray", "Quill Spray", "Physical", [
          special("quill_base_damage", [85]),
          special("quill_stack_damage", [30]),
        ]),
      ]),
      { ...attributes, attacksInWindow: 0, damageMin: 0, damageMax: 0 },
      [],
      physicalProfile,
    );
    expect(damage.physical).toBeCloseTo(295 * 1.195, 5);
  });

  it("Insatiable Hunger menambah 70% average damage", () => {
    const damage = calculateDamage(
      hero([
        ability(
          "broodmother_insatiable_hunger",
          "Insatiable Hunger",
          "Physical",
          [special("bonus_damage", [70])],
        ),
      ]),
      attributes,
      [],
      physicalProfile,
    );
    expect(damage.physical).toBeCloseTo(1700, 5);
  });

  it("Searing Arrows menambah bonus damage per hit", () => {
    const damage = calculateDamage(
      hero([
        ability("clinkz_searing_arrows", "Searing Arrows", "Physical", [
          special("damage_bonus", [65]),
        ]),
      ]),
      attributes,
      [],
      physicalProfile,
    );
    expect(damage.physical).toBeCloseTo(1650, 5);
  });

  it("Jinada menambah bonus damage tiga kali dalam window", () => {
    const damage = calculateDamage(
      hero([
        ability("bounty_hunter_jinada", "Jinada", "Physical", [
          special("bonus_damage", [175]),
          special("AbilityCooldown", [3]),
        ]),
      ]),
      attributes,
      [],
      physicalProfile,
    );
    expect(damage.physical).toBeCloseTo(1000 + 3 * 175, 5);
  });

  it("Multishot memakai wave count dan attack damage", () => {
    const damage = calculateDamage(
      hero([
        ability("drow_ranger_multishot", "Multishot", "Physical", [
          special("wave_count", [3]),
          special("arrow_damage_pct", [140]),
        ]),
      ]),
      attributes,
      [],
      physicalProfile,
    );
    expect(damage.physical).toBeCloseTo(1000 + 3 * 1.4 * 100, 5);
  });

  it("Ball Lightning memakai damage per 100 unit", () => {
    const stormAttributes: AttributesResult = {
      ...attributes,
      maxMana: 1638.6,
      attacksInWindow: 0,
    };
    const damage = calculateDamage(
      hero([
        ability("storm_spirit_ball_lightning", "Ball Lightning", "Magical", [
          special("ball_lightning_initial_mana_base", [25]),
          special("ball_lightning_initial_mana_percentage", [7.5]),
          special("ball_lightning_travel_cost_base", [10]),
          special("ball_lightning_travel_cost_percent", [0.65]),
          special("AbilityDamage", [6, 10, 14]),
        ]),
      ]),
      stormAttributes,
      [],
      magicalProfile,
    );
    expect(damage.magic).toBeCloseTo(14 * (7218.6 / 100), 1);
  });

  it("Mana Void memakai 1000 missing mana", () => {
    const damage = calculateDamage(
      hero([
        ability("antimage_mana_void", "Mana Void", "Magical", [
          special("mana_void_damage_per_mana", [1]),
        ]),
      ]),
      { ...attributes, attacksInWindow: 0 },
      [],
      magicalProfile,
    );
    expect(damage.magic).toBeCloseTo(1000, 5);
  });

  it("Medusa Mana Shield menambah effective HP dari mana", () => {
    const durability = calculateDurability(
      hero([
        ability("medusa_mana_shield", "Mana Shield", null, [
          special("damage_per_mana", [2]),
        ]),
      ]),
      attributes,
      [],
    );
    expect(durability.maxHp).toBeCloseTo(4000, 5);
    expect(durability.detail.manaShieldEhp).toBeCloseTo(2000, 5);
  });
});
