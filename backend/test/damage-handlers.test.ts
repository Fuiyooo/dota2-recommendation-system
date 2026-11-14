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

function talent(
  abilityKey: string,
  specialValue: string,
  value: number,
  operation: number,
): AbilityData {
  return {
    id: 2,
    abilityKey: "talent_test",
    displayName: "Talent test",
    abilityType: "Talent",
    isInnate: false,
    maxLevel: 1,
    damageType: null,
    talentLevel: 10,
    linkedAbilityKey: null,
    specialValues: {
      bonusRefs: [{ abilityKey, specialValue, value, operation }],
      ownValues: [],
    },
    rawData: {},
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

  it("Mana Void memakai 5000 missing mana", () => {
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
    expect(damage.magic).toBeCloseTo(5000, 5);
  });

  it("Desolate memakai bonus_damage dari data", () => {
    const damage = calculateDamage(
      hero([
        ability("spectre_desolate", "Desolate", "Pure", [
          special("bonus_damage", [23.5]),
        ]),
      ]),
      attributes,
      [],
      physicalProfile,
    );
    expect(damage.pure).toBeCloseTo(23.5 * 10, 5);
  });

  it("Chaos Strike menambah crit pada basic attack", () => {
    const damage = calculateDamage(
      hero([
        ability("chaos_knight_chaos_strike", "Chaos Strike", "Physical", [
          special("chance", [33.33]),
          special("crit_min", [120]),
          special("crit_max", [270]),
        ]),
      ]),
      attributes,
      [],
      physicalProfile,
    );
    expect(damage.physical).toBeCloseTo(1000 + 100 * 10 * 0.3333 * 0.95, 4);
  });

  it("God's Strength mengalikan basic attack", () => {
    const damage = calculateDamage(
      hero([
        ability("sven_gods_strength", "God's Strength", null, [
          special("gods_strength_damage", [190]),
        ]),
      ]),
      attributes,
      [],
      physicalProfile,
    );
    expect(damage.physical).toBeCloseTo(1000 + 100 * 10 * 1.9, 5);
  });

  it("Malefice memakai tiga instance", () => {
    const damage = calculateDamage(
      hero([ability("enigma_malefice", "Malefice", "Magical", [special("damage", [100])])]),
      { ...attributes, attacksInWindow: 0 },
      [],
      magicalProfile,
    );
    expect(damage.magic).toBeCloseTo(300, 5);
  });

  it("Black Hole memakai damage per detik", () => {
    const damage = calculateDamage(
      hero([
        ability("enigma_black_hole", "Black Hole", "Pure", [
          special("damage", [200]),
          special("duration", [4]),
        ]),
      ]),
      { ...attributes, attacksInWindow: 0 },
      [],
      magicalProfile,
    );
    expect(damage.pure).toBeCloseTo(800, 5);
  });

  it("Firestorm memakai enam wave", () => {
    const damage = calculateDamage(
      hero([
        ability("abyssal_underlord_firestorm", "Firestorm", "Magical", [
          special("wave_count", [6]),
          special("wave_damage", [105]),
        ]),
      ]),
      { ...attributes, attacksInWindow: 0 },
      [],
      magicalProfile,
    );
    expect(damage.magic).toBeCloseTo(630, 5);
  });

  it("Pit of Malice memakai tick dalam window", () => {
    const damage = calculateDamage(
      hero([
        ability("abyssal_underlord_pit_of_malice", "Pit of Malice", "Magical", [
          special("pit_damage", [50]),
          special("pit_interval", [3.6]),
          special("pit_duration", [12]),
        ]),
      ]),
      { ...attributes, attacksInWindow: 0 },
      [],
      magicalProfile,
    );
    expect(damage.magic).toBeCloseTo(150, 5);
  });

  it("Spirits memakai lima spirit dan dua putaran", () => {
    const damage = calculateDamage(
      hero([
        ability("wisp_spirits", "Spirits", "Magical", [
          special("hero_damage", [90]),
          special("spirit_amount", [5]),
          special("revolution_time", [5]),
        ]),
      ]),
      { ...attributes, attacksInWindow: 0 },
      [],
      magicalProfile,
    );
    expect(damage.magic).toBeCloseTo(900, 5);
  });

  it("Poof dihitung untuk semua Meepo", () => {
    const damage = calculateDamage(
      hero([
        ability("meepo_poof", "Poof", "Magical", [special("poof_damage", [140])]),
        ability("meepo_divided_we_stand", "Divided We Stand", null, [
          special("tooltip_clones", [4]),
        ]),
      ]),
      { ...attributes, attacksInWindow: 0 },
      [],
      magicalProfile,
    );
    expect(damage.magic).toBeCloseTo(700, 5);
  });

  it("Chaos Bolt memakai rata-rata damage min dan max", () => {
    const damage = calculateDamage(
      hero([
        ability("chaos_knight_chaos_bolt", "Chaos Bolt", "Magical", [
          special("damage_min", [180]),
          special("damage_max", [410]),
        ]),
      ]),
      { ...attributes, attacksInWindow: 0 },
      [],
      magicalProfile,
    );
    expect(damage.magic).toBeCloseTo(295, 5);
  });

  it("Clone Meepo menambah basic attack", () => {
    const damage = calculateDamage(
      hero([
        ability("meepo_divided_we_stand", "Divided We Stand", null, [
          special("tooltip_clones", [4]),
        ]),
      ]),
      attributes,
      [],
      physicalProfile,
    );
    expect(damage.physical).toBeCloseTo(1000 + 4 * 100 * 10, 5);
  });

  it("Phantasm menambah tiga illusion", () => {
    const damage = calculateDamage(
      hero([
        ability("chaos_knight_phantasm", "Phantasm", null, [
          special("images_count", [3]),
          special("outgoing_damage_tooltip", [100]),
        ]),
      ]),
      attributes,
      [],
      physicalProfile,
    );
    expect(damage.physical).toBeCloseTo(1000 + 3 * 100 * 10, 5);
  });

  it("talent persentase mengalikan damage Rip Tide", () => {
    const ripTide = ability("naga_siren_rip_tide", "Rip Tide", "Magical", [
      special("damage", [60]),
      special("hits", [6]),
    ]);
    const bonus = talent("naga_siren_rip_tide", "damage", 30, 3);
    const damage = calculateDamage(
      hero([ripTide, bonus]),
      { ...attributes, attacksInWindow: 0 },
      [bonus],
      magicalProfile,
    );
    expect(damage.magic).toBeCloseTo(60 * 1.3 * 6, 5);
  });

  it("Mirror Image menambah illusion Naga", () => {
    const damage = calculateDamage(
      hero([
        ability("naga_siren_mirror_image", "Mirror Image", null, [
          special("images_count", [3]),
          special("outgoing_damage_tooltip", [40]),
          special("illusion_duration", [26]),
        ]),
      ]),
      attributes,
      [],
      physicalProfile,
    );
    expect(damage.physical).toBeCloseTo(1000 + 3 * 0.4 * 100 * 10, 5);
  });

  it("Juxtapose dan Doppelganger menambah illusion Phantom Lancer", () => {
    const damage = calculateDamage(
      hero([
        ability("phantom_lancer_juxtapose", "Juxtapose", null, [
          special("tooltip_illusion_damage", [15]),
          special("illusion_duration", [8]),
        ]),
        ability("phantom_lancer_doppelwalk", "Doppelganger", null, [
          special("illusion_2_amount", [1]),
          special("illusion_2_damage_out_pct", [-80]),
          special("illusion_duration", [8]),
        ]),
      ]),
      attributes,
      [],
      physicalProfile,
    );
    expect(damage.physical).toBeCloseTo(
      1000 + 5 * 0.15 * 100 * 8 + 1 * 0.2 * 100 * 8,
      5,
    );
  });

  it("Spirit Bear menambah serangan unit kedua", () => {
    const damage = calculateDamage(
      hero([
        ability("lone_druid_spirit_bear", "Spirit Bear", null, [
          special("bear_bat", [1.5]),
          special("agility_gain_tooltip", [4.5]),
        ]),
      ]),
      attributes,
      [],
      physicalProfile,
    );
    expect(damage.physical).toBeCloseTo(1000 + 100 * 15, 5);
  });

  it("Essence Shift menambah damage dari stack agility", () => {
    const stacked = { ...attributes, attackSpeedTotal: 200, attacksInWindow: 8 };
    const damage = calculateDamage(
      hero([
        ability("slark_essence_shift", "Essence Shift", null, [
          special("agi_gain", [4]),
        ]),
      ]),
      stacked,
      [],
      physicalProfile,
    );
    expect(damage.physical).toBeCloseTo(1612, 5);
  });

  it("Eclipse memakai damage Lucent Beam per beam", () => {
    const damage = calculateDamage(
      hero([
        ability("luna_lucent_beam", "Lucent Beam", "Magical", [
          special("beam_damage", [380]),
        ]),
        ability("luna_eclipse", "Eclipse", "Magical", [
          special("beams", [12]),
        ]),
      ]),
      { ...attributes, attacksInWindow: 0 },
      [],
      magicalProfile,
    );
    expect(damage.magic).toBeCloseTo(380 + 12 * 380, 5);
  });

  it("Eye of the Storm memakai strike per interval", () => {
    const damage = calculateDamage(
      hero([
        ability("razor_eye_of_the_storm", "Eye of the Storm", "Physical", [
          special("damage", [90]),
          special("strike_interval", [0.5]),
          special("duration", [30]),
        ]),
      ]),
      { ...attributes, attacksInWindow: 0 },
      [],
      physicalProfile,
    );
    expect(damage.physical).toBeCloseTo(90 * 20, 5);
  });

  it("Storm Surge memakai expected proc", () => {
    const damage = calculateDamage(
      hero([
        ability("razor_storm_surge", "Storm Surge", "Magical", [
          special("strike_damage", [170]),
          special("strike_pct_chance", [20]),
          special("strike_internal_cd", [2.5]),
        ]),
      ]),
      { ...attributes, attacksInWindow: 0 },
      [],
      magicalProfile,
    );
    expect(damage.magic).toBeCloseTo(170 * 0.8, 5);
  });

  it("Summon Wolves menambah dua wolf", () => {
    const damage = calculateDamage(
      hero([
        ability("lycan_summon_wolves", "Summon Wolves", null, [
          special("wolf_count", [2]),
          special("wolf_damage", [52]),
          special("wolf_bat", [0.9]),
        ]),
      ]),
      attributes,
      [],
      physicalProfile,
    );
    expect(damage.physical).toBeCloseTo(1000 + 2 * 52 * 11, 5);
  });

  it("Bone Guard menambah delapan skeleton", () => {
    const damage = calculateDamage(
      hero([
        ability("skeleton_king_bone_guard", "Bone Guard", null, [
          special("max_skeleton_charges", [8]),
          special("skeleton_damage_tooltip", [49]),
        ]),
      ]),
      attributes,
      [],
      physicalProfile,
    );
    expect(damage.physical).toBeCloseTo(1000 + 8 * 49 * 8, 5);
  });

  it("Dawnbreaker memakai 3 putaran, Luminosity, dan Break of Dawn", () => {
    const damage = calculateDamage(
      hero([
        ability("dawnbreaker_fire_wreath", "Starbreaker", "Physical", [
          special("total_attacks", [3]),
          special("smash_damage", [70]),
        ]),
        ability("dawnbreaker_luminosity", "Luminosity", null, [
          special("bonus_damage", [200]),
        ]),
        ability("dawnbreaker_break_of_dawn", "Break of Dawn", null, [
          special("max_dmg_pct", [8]),
        ]),
      ]),
      attributes,
      [],
      physicalProfile,
    );
    expect(damage.physical).toBeCloseTo(1000 + 3 * 170 + 4 * 200 + 80, 5);
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
