import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { OpenDotaHeroes } from "../src/data-sources/opendota/opendota.types";
import type { ValveHeroDataResponse } from "../src/data-sources/valve/valve.types";
import {
  normalizeHeroBundle,
} from "../src/sync/normalizers";
import {
  INTERNAL_WEIGHTS,
  normalizeWeights,
  scoreFromPercentile,
} from "../src/characteristics/config";
import { calculateAttributes } from "../src/characteristics/shared/attribute-calculator";
import { selectTalents } from "../src/characteristics/shared/talent-resolver";
import { calculateDamage } from "../src/characteristics/damage/damage-calculator";
import { calculateDurability } from "../src/characteristics/durability/durability-calculator";
import { calculateCrowdControl } from "../src/characteristics/crowd-control/cc-calculator";
import { calculateMobility } from "../src/characteristics/mobility/mobility-calculator";
import { percentileRank } from "../src/scoring/percentile";
import { pickMainPositions } from "../src/saw/main-position";
import type { AbilityData, HeroData } from "../src/characteristics/types";

function fixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(join(__dirname, "fixtures", name), "utf8"),
  ) as T;
}

const opendotaHeroes = fixture<OpenDotaHeroes>("opendota-heroes.json");

function buildHero(valveFile: string, heroId: string): HeroData {
  const response = fixture<ValveHeroDataResponse>(valveFile);
  const valve = response.result.data.heroes[0];
  const bundle = normalizeHeroBundle(valve, opendotaHeroes[heroId]);
  const abilities: AbilityData[] = [
    ...bundle.abilities.map((ability) => ({
      id: ability.id,
      abilityKey: ability.abilityKey,
      displayName: ability.displayName,
      abilityType: ability.abilityType,
      isInnate: ability.isInnate,
      maxLevel: ability.maxLevel,
      damageType: ability.damageType,
      talentLevel: null,
      linkedAbilityKey: null,
      specialValues: ability.specialValues,
      rawData: ability.rawData,
      sortOrder: ability.sortOrder,
    })),
    ...bundle.talents.map((talent) => ({
      id: talent.id,
      abilityKey: talent.abilityKey,
      displayName: talent.displayName,
      abilityType: "Talent",
      isInnate: false,
      maxLevel: 1,
      damageType: null,
      talentLevel: talent.talentLevel,
      linkedAbilityKey: talent.linkedAbilityKey,
      specialValues: talent.specialValues,
      rawData: talent.rawData,
      sortOrder: talent.sortOrder,
    })),
  ];

  const { rawConstants: _rawConstants, ...hero } = bundle.hero;
  return { ...hero, abilities };
}

const lina = buildHero("valve-lina.json", "25");
const antiMage = buildHero("valve-antimage.json", "1");
const abaddon = buildHero("valve-abaddon.json", "102");

function damageProfile(hero: HeroData) {
  const talents = selectTalents(hero).talents;
  const attributes = calculateAttributes(hero, talents);
  return { talents, attributes, damage: calculateDamage(hero, attributes, talents) };
}

describe("atribut dan basic attack", () => {
  it("memakai seluruh 8 talent di level 30", () => {
    const talents = selectTalents(lina).talents;
    expect(talents).toHaveLength(8);
    const levels = [...new Set(talents.map((talent) => talent.talentLevel))];
    expect(levels.sort((left, right) => (left ?? 0) - (right ?? 0))).toEqual([
      10, 15, 20, 25,
    ]);
  });

  it("menghitung atribut Lina level 30", () => {
    const { attributes } = damageProfile(lina);
    expect(attributes.strength).toBeCloseTo(89.6, 5);
    expect(attributes.agility).toBeCloseTo(90.6, 5);
    expect(attributes.intelligence).toBeCloseTo(144, 5);
    expect(attributes.maxHp).toBeCloseTo(2091.2, 5);
    expect(attributes.armor).toBeCloseTo(15.1, 5);
    expect(attributes.magicResistance).toBeCloseTo(39.4, 5);
  });

  it("memakai attack point dan BAT Lina", () => {
    const { attributes } = damageProfile(lina);
    expect(attributes.attackPoint).toBeCloseTo(0.65, 5);
    expect(attributes.attackPointSource).toBe("opendota");
    expect(attributes.bat).toBeCloseTo(1.6, 5);
    expect(attributes.attacksInWindow).toBe(12);
  });

  it("menambahkan atribut utama ke damage hero normal", () => {
    const { attributes } = damageProfile(lina);
    expect(attributes.damageMin).toBeCloseTo(190, 5);
    expect(attributes.damageMax).toBeCloseTo(198, 5);
  });

  it("memakai formula Universal untuk Abaddon", () => {
    const { attributes } = damageProfile(abaddon);
    expect(attributes.damageMin).toBeCloseTo(189.23, 2);
    expect(attributes.damageMax).toBeCloseTo(199.23, 2);
    expect(attributes.attacksInWindow).toBeGreaterThan(0);
  });
});

describe("damage", () => {
  it("menghitung basic attack dan Slow Burn Lina", () => {
    const { attributes, talents, damage } = damageProfile(lina);
    expect(attributes.attacksInWindow).toBe(12);
    expect(damage.physical).toBeCloseTo(2328, 0);
    expect(damage.magic).toBeCloseTo(2394, 0);
    expect(damage.pure).toBe(0);
    expect(damage.status).toBe("SUPPORTED");
    expect(talents.length).toBeGreaterThan(0);
  });

  it("menghitung Mana Break Anti-Mage per serangan", () => {
    const { damage } = damageProfile(antiMage);
    expect(damage.physical).toBeCloseTo(2708, 0);
    const manaBreak = damage.detail.manaBreak as { total: number };
    expect(manaBreak.total).toBeCloseTo(650, 0);
  });

  it("menghitung damage universal Abaddon", () => {
    const { damage } = damageProfile(abaddon);
    expect(damage.physical).toBeGreaterThan(2500);
  });
});

describe("durability, CC, dan mobility", () => {
  it("menghitung durability dasar Lina", () => {
    const attributes = calculateAttributes(lina, []);
    const durability = calculateDurability(lina, attributes, []);
    expect(durability.maxHp).toBeCloseTo(2091.2, 5);
    expect(durability.armor).toBeCloseTo(15.1, 5);
  });

  it("menambahkan magic resistance dari INT dan Counterspell", () => {
    const talents = selectTalents(antiMage).talents;
    const attributes = calculateAttributes(antiMage, talents);
    const baseMr = 25 + 0.1 * attributes.intelligence;
    const expected = 100 * (1 - (1 - baseMr / 100) * (1 - 0.35));
    expect(attributes.magicResistance).toBeCloseTo(expected, 5);
    expect(attributes.magicResistance).toBeGreaterThan(50);
  });

  it("menambahkan armor dan HP regen dari Dragon Blood", () => {
    const dragonBlood: AbilityData = {
      id: 1,
      abilityKey: "dragon_knight_dragon_blood",
      displayName: "Dragon Blood",
      abilityType: "Innate",
      isInnate: true,
      maxLevel: 4,
      damageType: null,
      talentLevel: null,
      linkedAbilityKey: null,
      specialValues: [
        {
          name: "health_regen",
          heading: "BONUS HP REGEN:",
          values: [2],
          isPercentage: false,
          bonuses: [
            {
              name: "special_bonus_unique_dragon_knight",
              value: 12,
              operation: 0,
            },
          ],
          scepterValues: [],
          shardValues: [],
        },
        {
          name: "armor",
          heading: "BONUS ARMOR:",
          values: [2],
          isPercentage: false,
          bonuses: [
            {
              name: "special_bonus_unique_dragon_knight",
              value: 12,
              operation: 0,
            },
          ],
          scepterValues: [],
          shardValues: [],
        },
      ],
      rawData: {
        desc_loc:
          "The life blood of the Dragon improves health regeneration and armor.",
      },
      sortOrder: 0,
    };
    const dragonTalent: AbilityData = {
      id: 2,
      abilityKey: "special_bonus_unique_dragon_knight",
      displayName: "+12 Dragon Blood HP Regen/Armor",
      abilityType: "Talent",
      isInnate: false,
      maxLevel: 1,
      damageType: null,
      talentLevel: 25,
      linkedAbilityKey: null,
      specialValues: {
        bonusRefs: [
          {
            abilityKey: "dragon_knight_dragon_blood",
            specialValue: "health_regen",
            value: 12,
            operation: 0,
          },
          {
            abilityKey: "dragon_knight_dragon_blood",
            specialValue: "armor",
            value: 12,
            operation: 0,
          },
        ],
        ownValues: [],
      },
      rawData: {},
      sortOrder: 0,
    };
    const dragonKnight: HeroData = {
      id: 1,
      localizedName: "Dragon Knight",
      primaryAttr: "STR",
      attackType: "Melee",
      baseStr: 21,
      baseAgi: 14,
      baseInt: 18,
      strGain: 3.2,
      agiGain: 2,
      intGain: 1.5,
      attackRange: 150,
      moveSpeed: 285,
      armor: 2.3333335,
      damageMin: 50,
      damageMax: 56,
      attackRate: 1.6,
      attackPoint: 0.5,
      baseHealth: 582,
      healthRegen: 2.35,
      baseMana: 291,
      baseMagicResistance: 25,
      abilities: [dragonBlood, dragonTalent],
    };
    const attributes = calculateAttributes(dragonKnight, [dragonTalent]);
    expect(attributes.armor).toBeCloseTo(26, 5);
    expect(attributes.healthRegen).toBeCloseTo(25.63, 5);
    expect(attributes.magicResistance).toBeCloseTo(31.15, 5);
    const durability = calculateDurability(
      dragonKnight,
      attributes,
      [dragonTalent],
    );
    expect(durability.healthRegen).toBeCloseTo(25.63, 5);
    expect(durability.armor).toBeCloseTo(26, 5);
  });

  it("mendeteksi CC Lina", () => {
    const cc = calculateCrowdControl(lina, selectTalents(lina).talents);
    expect(cc.disableDuration).toBeGreaterThan(0);
  });

  it("menghitung blink Anti-Mage dari cast range", () => {
    const talents = selectTalents(antiMage).talents;
    const attributes = calculateAttributes(antiMage, talents);
    const mobility = calculateMobility(antiMage, attributes, talents);
    expect(mobility.blinkDistance).toBeCloseTo(1100, 0);
  });
});

describe("scoring dan SAW", () => {
  it("memetakan percentile ke skor 1 sampai 10", () => {
    expect(scoreFromPercentile(0)).toBe(1);
    expect(scoreFromPercentile(10)).toBe(1);
    expect(scoreFromPercentile(10.1)).toBe(2);
    expect(scoreFromPercentile(80)).toBe(8);
    expect(scoreFromPercentile(80.1)).toBe(9);
    expect(scoreFromPercentile(100)).toBe(10);
  });

  it("memakai bobot durability 50/25/25", () => {
    expect(INTERNAL_WEIGHTS.durability).toEqual({
      maxHp: 0.5,
      armor: 0.25,
      magicResistance: 0.25,
    });
    expect(
      Object.values(INTERNAL_WEIGHTS.durability).reduce(
        (sum, value) => sum + value,
        0,
      ),
    ).toBeCloseTo(1, 6);
  });

  it("memakai bobot mobility 30/30/40", () => {
    expect(INTERNAL_WEIGHTS.mobility).toEqual({
      movementSpeed: 0.4,
      mobilityDistance: 0.6,
    });
    expect(
      Object.values(INTERNAL_WEIGHTS.mobility).reduce(
        (sum, value) => sum + value,
        0,
      ),
    ).toBeCloseTo(1, 6);
  });

  it("menormalisasi bobot SAW ke total 1", () => {
    const weights = normalizeWeights({
      damage: 2,
      durability: 1,
      crowdControl: 1,
      mobility: 0,
    });
    expect(weights.damage).toBeCloseTo(0.5, 6);
    expect(weights.durability).toBeCloseTo(0.25, 6);
    expect(weights.crowdControl).toBeCloseTo(0.25, 6);
    expect(weights.mobility).toBeCloseTo(0, 6);
    expect(
      weights.damage +
        weights.durability +
        weights.crowdControl +
        weights.mobility,
    ).toBeCloseTo(1, 6);
  });

  it("memberi percentile 0 untuk nilai nol dan 100 untuk nilai tertinggi", () => {
    expect(percentileRank(0, [0, 1, 2])).toBe(0);
    expect(percentileRank(1, [1, 2, 3])).toBe(0);
    expect(percentileRank(3, [1, 2, 3])).toBe(100);
    expect(percentileRank(5, [5])).toBe(100);
  });

  it("menangani ties dengan peringkat rata-rata", () => {
    expect(percentileRank(2, [1, 2, 2, 3])).toBeCloseTo(50, 6);
  });

  it("memilih main position dari pick rate tertinggi", () => {
    const positions = pickMainPositions([
      { heroId: 1, position: 1, pickRate: 0.2, matchCount: 100 },
      { heroId: 1, position: 2, pickRate: 0.5, matchCount: 250 },
      { heroId: 2, position: 1, pickRate: 0.4, matchCount: 100 },
      { heroId: 2, position: 2, pickRate: 0.4, matchCount: 200 },
      { heroId: 3, position: 3, pickRate: 0.4, matchCount: 100 },
      { heroId: 3, position: 4, pickRate: 0.4, matchCount: 100 },
    ]);
    expect(positions.get(1)).toBe(2);
    expect(positions.get(2)).toBe(2);
    expect(positions.get(3)).toBe(3);
  });
});
