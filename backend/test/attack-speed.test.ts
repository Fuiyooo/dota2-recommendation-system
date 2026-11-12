import { describe, expect, it } from "vitest";
import { calculateAttributes } from "../src/characteristics/shared/attribute-calculator";
import { abilityAttackSpeedBonus } from "../src/characteristics/shared/attack-speed-config";
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
    attackType: "Melee",
    baseStr: 20,
    baseAgi: 0,
    baseInt: 20,
    strGain: 0,
    agiGain: 0,
    intGain: 0,
    attackRange: 150,
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

describe("bonus attack speed dari ability", () => {
  it("menjumlahkan ability yang tidak kondisional", () => {
    const total = abilityAttackSpeedBonus([
      ability("beastmaster_inner_beast", "Inner Beast", [
        special("bonus_attack_speed", [7]),
      ]),
      ability("bloodseeker_bloodrage", "Bloodrage", [
        special("attack_speed", [130]),
      ]),
    ]);
    expect(total).toBe(137);
  });

  it("mengabaikan ability kondisional", () => {
    const total = abilityAttackSpeedBonus([
      ability("lina_fiery_soul", "Fiery Soul", [
        special("fiery_soul_attack_speed_bonus", [28]),
      ]),
    ]);
    expect(total).toBe(0);
  });

  it("mengabaikan debuff attack speed untuk musuh", () => {
    const total = abilityAttackSpeedBonus([
      ability("viper_corrosive_skin", "Corrosive Skin", [
        special("bonus_attack_speed", [36]),
      ]),
    ]);
    expect(total).toBe(0);
  });

  it("menambahkan ability attack speed ke atribut", () => {
    const result = calculateAttributes(
      hero([
        ability("beastmaster_inner_beast", "Inner Beast", [
          special("bonus_attack_speed", [7]),
        ]),
      ]),
      [],
    );
    expect(result.abilityAttackSpeed).toBe(7);
    expect(result.attackSpeedBonus).toBe(7);
    expect(result.attackSpeedTotal).toBe(107);
  });
});
