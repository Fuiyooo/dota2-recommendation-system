import { describe, expect, it } from "vitest";
import { calculateCrowdControl } from "../src/characteristics/crowd-control/cc-calculator";
import type { AbilityData, HeroData } from "../src/characteristics/types";

function special(name: string, values: number[]) {
  return {
    name,
    heading: "DURATION:",
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
  options: {
    desc: string;
    notes?: string[];
    abilityType?: string;
    specials?: Array<ReturnType<typeof special>>;
    dispellable?: number;
    immunity?: number;
  },
): AbilityData {
  return {
    id: 1,
    abilityKey,
    displayName,
    abilityType: options.abilityType ?? "Active",
    isInnate: options.abilityType === "Innate",
    maxLevel: 4,
    damageType: null,
    talentLevel: null,
    linkedAbilityKey: null,
    specialValues: options.specials ?? [],
    rawData: {
      desc_loc: options.desc,
      notes_loc: options.notes ?? [],
      ...(options.dispellable !== undefined
        ? { dispellable: options.dispellable }
        : {}),
      ...(options.immunity !== undefined
        ? { immunity: options.immunity }
        : {}),
    },
    sortOrder: 0,
  };
}

function hero(abilities: AbilityData[]): HeroData {
  return {
    id: 1,
    localizedName: "Test",
    primaryAttr: "UNIVERSAL",
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

function cc(abilities: AbilityData[]) {
  return calculateCrowdControl(hero(abilities), []);
}

describe("klasifikasi CC memakai desc_loc, bukan notes_loc", () => {
  it("tidak menganggap Bladeform sebagai soft CC", () => {
    const result = cc([
      ability("juggernaut_bladeform", "Bladeform", {
        abilityType: "Innate",
        desc: "Juggernaut gains a stack of Bladeform every 2s that Juggernaut does not take damage. Each stack grants bonus base Agility and Movement Speed.",
        notes: ["Break disables the gaining of new stacks."],
        specials: [
          special("linger_duration", [2]),
          special("movement_speed_pct_per_stack", [1]),
        ],
      }),
    ]);
    expect(result.disableDuration).toBe(0);
    expect(result.detail.ccAbilities).toBe(0);
  });

  it("tidak menganggap Sun Ray sebagai CC", () => {
    const result = cc([
      ability("phoenix_sun_ray", "Sun Ray", {
        desc: "Phoenix expels a beam of light at the cost of its own health. The beam damages enemies and heals allies.",
        notes: [
          "Sun Ray is canceled if Phoenix gets stunned, silenced, cycloned, hexed or slept.",
        ],
        specials: [special("AbilityDuration", [6])],
      }),
    ]);
    expect(result.disableDuration).toBe(0);
  });

  it("tidak memakai linger_duration sebagai durasi CC", () => {
    const result = cc([
      ability("test_slow_aura", "Slow Aura", {
        desc: "Slows enemies around the caster.",
        specials: [special("linger_duration", [2])],
      }),
    ]);
    expect(result.disableDuration).toBe(0);
  });

  it("mengabaikan field scepter_stun_duration", () => {
    const result = cc([
      ability("sniper_assassinate", "Assassinate", {
        desc: "Sniper takes aim and stuns the target after a delay.",
        specials: [special("scepter_stun_duration", [1.2])],
      }),
    ]);
    expect(result.disableDuration).toBe(0);
  });

  it("tidak memakai besaran slow sebagai durasi", () => {
    const result = cc([
      ability("magnataur_shockwave", "Shockwave", {
        desc: "Magnus sends out a wave of force, damaging and slowing enemies.",
        specials: [
          special("movement_slow", [75]),
          special("slow_duration", [2]),
        ],
      }),
    ]);
    expect(result.disableDuration).toBe(0);
    expect(result.detail.softDuration).toBe(2);
  });

  it("memakai debuff_duration untuk stun", () => {
    const result = cc([
      ability("hoodwink_bushwhack", "Bushwhack", {
        desc: "Tosses a net trap that stuns enemies if they are near a tree in the area.",
        specials: [special("debuff_duration", [2.1])],
        dispellable: 1,
        immunity: 0,
      }),
    ]);
    expect(result.disableDuration).toBeCloseTo(2.1 * 0.8 * 0.6, 6);
  });

  it("mengabaikan recoil_duration saat memilih slow terpanjang", () => {
    const result = cc([
      ability("hoodwink_sharpshooter", "Sharpshooter", {
        desc: "Hoodwink charges up and fires a bolt, dealing damage, break and slow to an enemy hero.",
        specials: [
          special("max_slow_debuff_duration", [5]),
          special("recoil_duration", [0.4]),
        ],
      }),
    ]);
    expect(result.disableDuration).toBe(0);
    expect(result.detail.softDuration).toBe(5);
  });
});

describe("override manual untuk CC berbahasa biasa", () => {
  it("Frostbite tercatat sebagai root tetapi tidak menambah disable", () => {
    const result = cc([
      ability("crystal_maiden_frostbite", "Frostbite", {
        desc: "Encases an enemy unit in ice, prohibiting movement and attack.",
        notes: ["Frostbite is considered a root."],
        specials: [special("duration", [3])],
      }),
    ]);
    expect(result.disableDuration).toBe(0);
    expect(result.detail.softDuration).toBe(3);
  });

  it("Cold Snap tetap dihitung sebagai stun", () => {
    const result = cc([
      ability("invoker_cold_snap", "Cold Snap", {
        desc: "Invoker draws the heat from an enemy, chilling them to their very core. The enemy will be briefly frozen.",
        notes: ["The freeze stun only triggers on damage."],
        specials: [special("freeze_duration", [6.2])],
        dispellable: 2,
        immunity: 4,
      }),
    ]);
    expect(result.disableDuration).toBeCloseTo(6.2 * 0.6 * 0.6, 6);
  });

  it("Savage Roar tetap dihitung sebagai fear", () => {
    const result = cc([
      ability("lone_druid_savage_roar", "Savage Roar", {
        desc: "Lone Druid and the Spirit Bear roar fiercely causing nearby enemies to flee towards their base in terror.",
        specials: [special("duration", [2.2])],
        dispellable: 2,
        immunity: 4,
      }),
    ]);
    expect(result.disableDuration).toBeCloseTo(2.2 * 0.6 * 0.6, 6);
  });

  it("Overgrowth tercatat sebagai root tetapi tidak menambah disable", () => {
    const result = cc([
      ability("treant_overgrowth", "Overgrowth", {
        desc: "Summons an overgrowth of vines that prevent enemies from moving, blinking, going invisible, or attacking.",
        notes: ["If units gain debuff immunity after the effect starts, they will break free."],
        specials: [
          special("duration", [5]),
          special("bloom_duration", [2]),
        ],
      }),
    ]);
    expect(result.disableDuration).toBe(0);
    expect(result.detail.softDuration).toBe(5);
  });

  it("Soulbind tercatat sebagai leash tetapi tidak menambah disable", () => {
    const result = cc([
      ability("grimstroke_soul_chain", "Soulbind", {
        desc: "Binds a targeted enemy hero to its nearest allied hero, preventing both from moving away from each other.",
        notes: ["Affected units are leashed and prevented from blinking."],
        specials: [
          special("chain_duration", [6]),
          special("creep_duration_pct", [50]),
        ],
      }),
    ]);
    expect(result.disableDuration).toBe(0);
    expect(result.detail.softDuration).toBe(6);
  });
});
