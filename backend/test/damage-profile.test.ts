import { describe, expect, it } from "vitest";
import {
  countsBasicAttack,
  damageWeights,
  isValidSecondary,
} from "../src/damage-profile/damage-profile.types";
import { calculateDamage } from "../src/characteristics/damage/damage-calculator";
import type { AttributesResult } from "../src/characteristics/shared/attribute-calculator";
import type { AbilityData, HeroData } from "../src/characteristics/types";
import { isAghanimGranted } from "../src/characteristics/shared/ability-scope";
import {
  isUpgradeOnlyValue,
  specialValuesOf,
} from "../src/characteristics/shared/special-values";
import { hashPassword, verifyPassword } from "../src/admin/password";

function attributes(): AttributesResult {
  return {
    strength: 0,
    agility: 0,
    intelligence: 0,
    damageMin: 100,
    damageMax: 100,
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
}

function hero(abilities: AbilityData[] = []): HeroData {
  return {
    id: 1,
    localizedName: "Techies",
    primaryAttr: "UNIVERSAL",
    attackType: "Ranged",
    baseStr: 19,
    baseAgi: 16,
    baseInt: 25,
    strGain: 2.6,
    agiGain: 1.8,
    intGain: 2.7,
    attackRange: 600,
    moveSpeed: 300,
    armor: 0,
    damageMin: 20,
    damageMax: 22,
    attackRate: 1.7,
    attackPoint: 0.5,
    baseHealth: 0,
    baseMana: 0,
    baseMagicResistance: 25,
    abilities,
  };
}

function ability(
  abilityKey: string,
  rawData: Record<string, unknown>,
): AbilityData {
  return {
    id: 1,
    abilityKey,
    displayName: abilityKey,
    abilityType: "Active",
    isInnate: false,
    maxLevel: 4,
    damageType: null,
    talentLevel: null,
    linkedAbilityKey: null,
    specialValues: [],
    rawData,
    sortOrder: 0,
  };
}

describe("bobot profil damage", () => {
  it("memakai 70 persen main dan 30 persen secondary", () => {
    expect(
      damageWeights({ main: "MAGICAL", secondary: "PURE" }),
    ).toEqual({
      physicalDamage: 0,
      magicDamage: 0.7,
      pureDamage: 0.3,
    });
  });

  it("memakai 100 persen main kalau secondary NONE", () => {
    expect(
      damageWeights({ main: "PHYSICAL", secondary: "NONE" }),
    ).toEqual({
      physicalDamage: 1,
      magicDamage: 0,
      pureDamage: 0,
    });
  });

  it("hanya menghitung basic attack kalau PHYSICAL main atau secondary", () => {
    expect(
      countsBasicAttack({ main: "PHYSICAL", secondary: "MAGICAL" }),
    ).toBe(true);
    expect(
      countsBasicAttack({ main: "MAGICAL", secondary: "PHYSICAL" }),
    ).toBe(true);
    expect(
      countsBasicAttack({ main: "MAGICAL", secondary: "PURE" }),
    ).toBe(false);
  });

  it("menolak secondary yang sama dengan main", () => {
    expect(isValidSecondary("MAGICAL", "MAGICAL")).toBe(false);
    expect(isValidSecondary("MAGICAL", "NONE")).toBe(true);
    expect(isValidSecondary("MAGICAL", "PHYSICAL")).toBe(true);
  });
});

describe("basic attack pada kalkulasi damage", () => {
  it("tidak menghitung basic attack untuk main MAGICAL", () => {
    const result = calculateDamage(hero(), attributes(), [], {
      main: "MAGICAL",
      secondary: "NONE",
    });
    expect(result.physical).toBe(0);
    expect(result.detail.basicAttack).toMatchObject({
      total: 0,
      counted: false,
    });
  });

  it("menghitung basic attack untuk main PHYSICAL", () => {
    const result = calculateDamage(hero(), attributes(), [], {
      main: "PHYSICAL",
      secondary: "MAGICAL",
    });
    expect(result.physical).toBeCloseTo(1000, 6);
    expect(result.detail.basicAttack).toMatchObject({
      total: 1000,
      counted: true,
    });
  });

  it("menandai PARTIAL kalau profil belum diisi", () => {
    const result = calculateDamage(
      hero(),
      attributes(),
      [],
      { main: "PHYSICAL", secondary: "MAGICAL" },
      true,
    );
    expect(result.status).toBe("PARTIAL");
  });
});

describe("scope Aghanim", () => {
  it("mengenali ability yang diberikan Scepter atau Shard", () => {
    expect(
      isAghanimGranted(
        ability("magnataur_horn_toss", {
          ability_is_granted_by_scepter: true,
        }),
      ),
    ).toBe(true);
    expect(isAghanimGranted(ability("lion_impale", {}))).toBe(false);
  });

  it("menyaring field scepter dan aghs_shard", () => {
    expect(isUpgradeOnlyValue("scepter_stun_duration")).toBe(true);
    expect(isUpgradeOnlyValue("aghs_shard_damage")).toBe(true);
    expect(isUpgradeOnlyValue("shard_damage")).toBe(false);

    const values = specialValuesOf({
      ...ability("sniper_assassinate", {}),
      specialValues: [
        { name: "scepter_stun_duration", values: [1.2] },
        { name: "damage", values: [100] },
      ],
    });
    expect(values.map((value) => value.name)).toEqual(["damage"]);
  });
});

describe("password admin", () => {
  it("menyimpan hash scrypt dan memverifikasi password", async () => {
    const hash = await hashPassword("rahasia-123");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("rahasia-123", hash)).toBe(true);
    expect(await verifyPassword("salah", hash)).toBe(false);
  });
});
