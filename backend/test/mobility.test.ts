import { describe, expect, it } from "vitest";
import { calculateMobility } from "../src/characteristics/mobility/mobility-calculator";
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
  specials: Array<ReturnType<typeof special>>,
): AbilityData {
  return {
    id: 1,
    abilityKey,
    displayName,
    abilityType: "Active",
    isInnate: false,
    maxLevel: 4,
    damageType: null,
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
    primaryAttr: "AGI",
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
    damageMin: 50,
    damageMax: 60,
    attackRate: 1.7,
    attackPoint: 0.4,
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
  damageMin: 0,
  damageMax: 0,
  attackSpeedBonus: 0,
  abilityAttackSpeed: 0,
  attackSpeedTotal: 100,
  bat: 1.7,
  attackPoint: 0.3,
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

function mobility(abilities: AbilityData[]) {
  return calculateMobility(hero(abilities), attributes, []);
}

describe("mobility hanya memakai daftar putih ability gerak", () => {
  it("tidak menghitung Shrapnel Sniper dari cast range", () => {
    const result = mobility([
      ability("sniper_shrapnel", "Shrapnel", [
        special("AbilityCastRange", [1800]),
      ]),
    ]);
    expect(result.dashDistance).toBe(0);
    expect(result.blinkDistance).toBe(0);
    expect(result.status).toBe("SUPPORTED");
  });

  it("tidak menghitung Powershot Windranger", () => {
    const result = mobility([
      ability("windrunner_powershot", "Powershot", [
        special("arrow_range", [3000]),
        special("AbilityCastRange", [3000]),
      ]),
    ]);
    expect(result.dashDistance).toBe(0);
  });

  it("tidak menghitung Wheel of Wonder Ringmaster", () => {
    const result = mobility([
      ability("ringmaster_wheel", "Wheel of Wonder", [
        special("knockback_distance", [100]),
        special("AbilityCastRange", [1400]),
      ]),
    ]);
    expect(result.dashDistance).toBe(0);
  });

  it("tidak menghitung Psionic Trap Templar Assassin", () => {
    const result = mobility([
      ability("templar_assassin_psionic_trap", "Psionic Trap", [
        special("AbilityCastRange", [1800]),
      ]),
    ]);
    expect(result.dashDistance).toBe(0);
  });

  it("tidak menghitung Glimpse Disruptor", () => {
    const result = mobility([
      ability("disruptor_glimpse", "Glimpse", [
        special("cast_range", [1800]),
        special("AbilityCastRange", [1800]),
      ]),
    ]);
    expect(result.blinkDistance).toBe(0);
  });
});

describe("ability gerak yang tetap dihitung", () => {
  it("Puck Illusory Orb memakai max_distance", () => {
    const result = mobility([
      ability("puck_illusory_orb", "Illusory Orb", [
        special("max_distance", [1950]),
        special("AbilityCastRange", [1950]),
      ]),
    ]);
    expect(result.dashDistance).toBe(1950);
    expect(result.mobilityDistance).toBe(1950);
  });

  it("Anti-Mage Blink memakai cast range", () => {
    const result = mobility([
      ability("antimage_blink", "Blink", [
        special("min_blink_range", [200]),
        special("AbilityCastRange", [1100]),
      ]),
    ]);
    expect(result.blinkDistance).toBe(1100);
    expect(result.mobilityDistance).toBe(1100);
  });

  it("Queen of Pain Blink memakai cast range", () => {
    const result = mobility([
      ability("queenofpain_blink", "Blink", [
        special("AbilityCastRange", [1300]),
      ]),
    ]);
    expect(result.blinkDistance).toBe(1300);
  });

  it("Fire Remnant memakai cast range", () => {
    const result = mobility([
      ability("ember_spirit_fire_remnant", "Fire Remnant", [
        special("AbilityCastRange", [1400]),
      ]),
    ]);
    expect(result.dashDistance).toBe(1400);
  });

  it("Ursa Earthshock memakai hop_distance", () => {
    const result = mobility([
      ability("ursa_earthshock", "Earthshock", [
        special("hop_distance", [250]),
      ]),
    ]);
    expect(result.dashDistance).toBe(250);
  });

  it("Pangolier Shield Crash memakai jump_horizontal_distance", () => {
    const result = mobility([
      ability("pangolier_shield_crash", "Shield Crash", [
        special("jump_horizontal_distance", [225]),
      ]),
    ]);
    expect(result.dashDistance).toBe(225);
  });
});

describe("asumsi dan ability tanpa jarak", () => {
  it("Ball Lightning memakai jarak berbasis mana", () => {
    const stormAttributes: AttributesResult = {
      ...attributes,
      maxMana: 1638.6,
    };
    const result = calculateMobility(
      hero([
        ability("storm_spirit_ball_lightning", "Ball Lightning", [
          special("ball_lightning_move_speed", [1400, 1850, 2300]),
          special("ball_lightning_initial_mana_base", [25]),
          special("ball_lightning_initial_mana_percentage", [7.5]),
          special("ball_lightning_travel_cost_base", [10]),
          special("ball_lightning_travel_cost_percent", [0.65]),
        ]),
      ]),
      stormAttributes,
      [],
    );
    expect(result.dashDistance).toBeCloseTo(7218.6, 1);
    expect(result.mobilityDistance).toBeCloseTo(7218.6, 1);
    expect(result.status).toBe("SUPPORTED");
  });

  it("mobilityDistance memakai jarak terbesar antara dash dan blink", () => {
    const result = mobility([
      ability("antimage_blink", "Blink", [
        special("AbilityCastRange", [1100]),
      ]),
      ability("ursa_earthshock", "Earthshock", [
        special("hop_distance", [250]),
      ]),
    ]);
    expect(result.blinkDistance).toBe(1100);
    expect(result.dashDistance).toBe(250);
    expect(result.mobilityDistance).toBe(1100);
  });

  it("Blast Off! tidak dihitung sebagai mobility", () => {
    const result = mobility([
      ability("techies_suicide", "Blast Off!", [
        special("AbilityCastRange", [1000]),
      ]),
    ]);
    expect(result.dashDistance).toBe(0);
    expect(result.status).toBe("SUPPORTED");
  });
});
