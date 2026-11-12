import { describe, expect, it } from "vitest";
import { calculateCrowdControl } from "../src/characteristics/crowd-control/cc-calculator";
import type { AbilityData, HeroData } from "../src/characteristics/types";
import type { CcAbilityConfigMap } from "../src/characteristics/crowd-control/cc-main-config";

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
  desc: string,
  specials: Array<ReturnType<typeof special>> = [],
  options: { dispellable?: number; immunity?: number } = {},
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
    rawData: { desc_loc: desc, notes_loc: [], ...options },
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

describe("field durasi CC yang eksplisit", () => {
  it("Chaos Bolt memakai titik tengah stun_min dan stun_max", () => {
    const result = cc([
      ability(
        "chaos_knight_chaos_bolt",
        "Chaos Bolt",
        "Stuns for a random duration.",
        [
          special("stun_min", [2]),
          special("stun_max", [3.25]),
          special("illusion_duration", [0]),
        ],
        { dispellable: 1, immunity: 4 },
      ),
    ]);
    expect(result.disableDuration).toBeCloseTo(2.625 * 0.8 * 0.6, 6);
  });

  it("Magic Missile memakai magic_missile_stun", () => {
    const result = cc([
      ability(
        "vengefulspirit_magic_missile",
        "Magic Missile",
        "Stunning and dealing damage.",
        [special("magic_missile_stun", [1.8])],
        { dispellable: 1, immunity: 4 },
      ),
    ]);
    expect(result.disableDuration).toBeCloseTo(1.8 * 0.8 * 0.6, 6);
  });

  it("Mana Void memakai mana_void_ministun", () => {
    const result = cc([
      ability(
        "antimage_mana_void",
        "Mana Void",
        "The main target is also mini-stunned.",
        [special("mana_void_ministun", [0.3])],
        { dispellable: 0, immunity: 4 },
      ),
    ]);
    expect(result.disableDuration).toBeCloseTo(0.3 * 0.6 * 0.6, 6);
  });

  it("Rain of Chaos memakai stun_duration, bukan golem_duration", () => {
    const result = cc([
      ability(
        "warlock_rain_of_chaos",
        "Chaotic Offering",
        "Summons a Golem, stunning enemies.",
        [
          special("stun_duration", [0.8]),
          special("golem_duration", [60]),
        ],
        { dispellable: 1, immunity: 3 },
      ),
    ]);
    expect(result.disableDuration).toBeCloseTo(0.8 * 0.8, 6);
  });
});

describe("durasi summon tidak dihitung sebagai CC", () => {
  it("Arc Warden hanya memakai Flux dan Spark Wraith", () => {
    const result = cc([
      ability(
        "arc_warden_flux",
        "Flux",
        "Dealing damage over time and slowing the target.",
        [special("duration", [6])],
      ),
      ability(
        "arc_warden_spark_wraith",
        "Spark Wraith",
        "Summons a Spark Wraith that patrols until an enemy is found, dealing damage and slowing.",
        [
          special("duration", [16]),
          special("ministun_duration", [1]),
        ],
      ),
      ability(
        "arc_warden_tempest_double",
        "Tempest Double",
        "Creates a duplication that becomes slower over time.",
        [special("duration", [24])],
      ),
    ]);
    expect(result.disableDuration).toBe(0);
    expect(result.detail.hardDuration).toBe(0);
    expect(result.detail.softDuration).toBe(7);
  });

  it("Clockwerk memakai Battery Assault dan Hookshot saja", () => {
    const result = cc([
      ability(
        "rattletrap_battery_assault",
        "Battery Assault",
        "Discharges shrapnel, dealing damage and ministun.",
        [special("duration", [10.5])],
      ),
      ability(
        "rattletrap_hookshot",
        "Hookshot",
        "Fires a grappling device that stuns the first enemy hit.",
        [special("duration", [1.6])],
        { dispellable: 1, immunity: 3 },
      ),
      ability(
        "rattletrap_rocket_flare",
        "Rocket Flare",
        "Fires a global range flare that damages enemy units and grants vision.",
        [special("duration", [6])],
      ),
    ]);
    expect(result.disableDuration).toBeCloseTo(1.5 * 0.6 + 1.6 * 0.8, 6);
  });
});

describe("multiplier dispel dan immunity di CC utama", () => {
  function withMultipliers(
    value: number,
    dispellable: number,
    immunity: number,
  ): number {
    const spell = ability(
      "magnataur_reverse_polarity",
      "Reverse Polarity",
      "Stuns enemies in an area.",
      [special("hero_stun_duration", [value])],
      { dispellable, immunity },
    );
    return cc([spell]).disableDuration;
  }

  it("strong dispellable memakai multiplier 0,8", () => {
    expect(withMultipliers(3.5, 1, 3)).toBeCloseTo(2.8, 6);
  });

  it("basic dispellable memakai multiplier 0,6", () => {
    expect(withMultipliers(2, 2, 3)).toBeCloseTo(1.2, 6);
  });

  it("undispellable memakai multiplier 1,0", () => {
    expect(withMultipliers(2, 3, 3)).toBeCloseTo(2, 6);
  });

  it("dispel 0 dianggap basic", () => {
    expect(withMultipliers(2, 0, 3)).toBeCloseTo(1.2, 6);
  });

  it("does not pierce memakai multiplier 0,6", () => {
    expect(withMultipliers(2, 3, 4)).toBeCloseTo(1.2, 6);
  });

  it("metadata manual cannot be dispelled dan tidak pierce", () => {
    const result = cc([
      ability(
        "medusa_stone_gaze",
        "Stone Gaze",
        "Petrified units are stunned.",
        [special("stone_duration", [2.4])],
      ),
    ]);
    expect(result.disableDuration).toBeCloseTo(2.4 * 0.6, 6);
  });

  it("config dari admin menimpa multiplier dispel dan pierce", () => {
    const config: CcAbilityConfigMap = new Map([
      [
        "magnataur_reverse_polarity",
        { dispelType: "UNDISPELLABLE", piercesImmunity: true },
      ],
    ]);
    const result = calculateCrowdControl(
      hero([
        ability(
          "magnataur_reverse_polarity",
          "Reverse Polarity",
          "Stuns enemies in an area.",
          [special("hero_stun_duration", [2])],
          { dispellable: 2, immunity: 4 },
        ),
      ]),
      [],
      config,
    );
    expect(result.disableDuration).toBeCloseTo(2, 6);
  });

  it("Electric Vortex dihitung hard pull dengan talent", () => {
    const result = calculateCrowdControl(
      hero([
        ability(
          "storm_spirit_electric_vortex",
          "Electric Vortex",
          "A vortex that pulls an enemy unit to Storm Spirit's location.",
          [special("AbilityDuration", [1.1, 1.4, 1.7, 2])],
          { dispellable: 1, immunity: 4 },
        ),
      ]),
      [talent("storm_spirit_electric_vortex", "AbilityDuration", 0.2)],
    );
    expect(result.disableDuration).toBeCloseTo(2.2 * 0.8 * 0.6, 6);
    expect(result.status).toBe("SUPPORTED");
  });

  it("Spirit Breaker bull rush tidak dihitung sebagai CC", () => {
    const result = cc([
      ability(
        "spirit_breaker_bull_rush",
        "Empowering Haste",
        "Stuns and grants attack speed.",
        [special("duration", [2])],
      ),
    ]);
    expect(result.disableDuration).toBe(0);
  });
});

describe("ability yang ditandai review", () => {
  it("Rot tidak menambah CC karena slow toggle", () => {
    const result = cc([
      ability(
        "pudge_rot",
        "Rot",
        "A toxic cloud that deals damage and slows movement.",
        [special("rot_slow", [-32])],
      ),
    ]);
    expect(result.disableDuration).toBe(0);
    expect(result.status).toBe("SUPPORTED");
  });

  it("Assassinate Sniper tidak dihitung karena stun hanya dari Scepter", () => {
    const result = cc([
      ability(
        "sniper_assassinate",
        "Assassinate",
        "Fires a devastating shot.",
        [special("scepter_stun_duration", [1.2])],
      ),
    ]);
    expect(result.disableDuration).toBe(0);
  });
});

function talent(
  abilityKey: string,
  specialValue: string,
  value: number,
  operation = 0,
): AbilityData {
  return {
    id: 99,
    abilityKey,
    displayName: `Talent ${abilityKey} ${specialValue}`,
    abilityType: "Talent",
    isInnate: false,
    maxLevel: 1,
    damageType: null,
    talentLevel: 30,
    linkedAbilityKey: null,
    specialValues: {
      bonusRefs: [{ abilityKey, specialValue, value, operation }],
      ownValues: [],
    },
    rawData: {},
    sortOrder: 0,
  };
}

function abilitiesOf(result: ReturnType<typeof calculateCrowdControl>) {
  return (result.detail.abilities ?? []) as Array<{
    ability: string;
    hard: boolean;
    soft: boolean;
    duration: number;
    contribution: number;
  }>;
}

describe("ability CC baru dan aturan tipe", () => {
  it("Fiend's Grip memakai channel time dan talent 3 detik", () => {
    const result = calculateCrowdControl(
      hero([
        ability(
          "bane_fiends_grip",
          "Fiend's Grip",
          "CHANNELED - Grips an enemy unit, disabling it.",
          [special("AbilityChannelTime", [4.75, 5.25, 5.75])],
          { dispellable: 1, immunity: 3 },
        ),
      ]),
      [talent("bane_fiends_grip", "AbilityChannelTime", 3)],
    );
    expect(result.disableDuration).toBeCloseTo(8.75 * 0.8, 6);
    expect(abilitiesOf(result)[0].ability).toBe("Fiend's Grip");
  });

  it("Visage memakai Stone Form, bukan Summon Familiars", () => {
    const result = cc([
      ability(
        "visage_summon_familiars",
        "Summon Familiars",
        "Conjures blind Familiars that possess Stone Form.",
        [special("recall_duration", [4])],
        { dispellable: 0, immunity: 0 },
      ),
    ]);
    expect(result.disableDuration).toBeCloseTo(1.2 * 0.8 * 0.6, 6);
    expect(abilitiesOf(result)[0].ability).toBe("Stone Form");
    expect(result.detail.unresolved).toEqual([]);
  });

  it("Echo Stomp memakai 4,4 detik sleep", () => {
    const result = cc([
      ability(
        "elder_titan_echo_stomp",
        "Echo Stomp",
        "Knocks nearby enemy units unconscious.",
        [
          special("sleep_duration", [2, 2.8, 3.6, 4.4]),
          special("initial_stun_duration", [0.2]),
        ],
        { dispellable: 1, immunity: 4 },
      ),
    ]);
    expect(result.disableDuration).toBeCloseTo(4.4 * 0.8 * 0.6, 6);
  });

  it("Winter's Curse memakai 2 detik dan tidak bisa dispel", () => {
    const result = cc([
      ability(
        "winter_wyvern_winters_curse",
        "Winter's Curse",
        "Freezes an enemy in place while nearby enemies attack it.",
        [special("duration", [2]), special("max_duration", [6])],
        { dispellable: 0, immunity: 3 },
      ),
    ]);
    expect(result.disableDuration).toBeCloseTo(2, 6);
  });

  it("Black Hole tidak bisa dispel dan menembus immunity", () => {
    const result = cc([
      ability(
        "enigma_black_hole",
        "Black Hole",
        "Enemies affected cannot move, attack, or cast spells.",
        [special("duration", [4])],
        { dispellable: 0, immunity: 3 },
      ),
    ]);
    expect(result.disableDuration).toBeCloseTo(4, 6);
  });

  it("Song of the Siren menembus immunity walau Valve menulis tidak", () => {
    const result = cc([
      ability(
        "naga_siren_song_of_the_siren",
        "Song of the Siren",
        "Puts enemies into a magical stasis.",
        [special("duration", [7])],
        { dispellable: 3, immunity: 4 },
      ),
    ]);
    expect(result.disableDuration).toBeCloseTo(7, 6);
  });

  it("Adaptive Strike memakai stun maksimum, bukan knockback", () => {
    const result = cc([
      ability(
        "morphling_adaptive_strike_agi",
        "Adaptive Strike",
        "Stuns them and knocks them back.",
        [
          special("stun_min", [0.5]),
          special("stun_max", [1.4, 1.8, 2.2, 2.6]),
          special("knockback_duration", [0.5]),
        ],
        { dispellable: 0, immunity: 4 },
      ),
    ]);
    expect(result.disableDuration).toBeCloseTo(2.6 * 0.6 * 0.6, 6);
  });

  it("Ink Swell memakai max_stun, bukan buff duration", () => {
    const result = cc([
      ability(
        "grimstroke_spirit_walk",
        "Ink Swell",
        "After a delay it applies a stun in an area.",
        [special("buff_duration", [3]), special("max_stun", [1.6, 2, 2.4, 2.8])],
        { dispellable: 2, immunity: 5 },
      ),
    ]);
    expect(result.disableDuration).toBeCloseTo(2.8 * 0.6 * 0.6, 6);
  });

  it("Dream Coil memakai stun awal 0,5 detik", () => {
    const result = cc([
      ability(
        "puck_dream_coil",
        "Dream Coil",
        "Creates a coil that stuns enemies.",
        [
          special("stun_duration", [0.5]),
          special("coil_stun_duration", [1.5, 2, 2.5]),
        ],
        { dispellable: 3, immunity: 4 },
      ),
    ]);
    expect(result.disableDuration).toBeCloseTo(0.3, 6);
  });

  it("Tornado dihitung hard cyclone", () => {
    const result = cc([
      ability(
        "invoker_tornado",
        "Tornado",
        "Picks up enemy units, suspending them in the air.",
        [special("lift_duration", [1.2, 1.6, 2, 2.4, 2.8])],
        { dispellable: 2, immunity: 4 },
      ),
    ]);
    expect(result.disableDuration).toBeCloseTo(2.8 * 0.6 * 0.6, 6);
  });

  it("Charge of Darkness dihitung hard stun", () => {
    const result = cc([
      ability(
        "spirit_breaker_charge_of_darkness",
        "Charge of Darkness",
        "Enemies passed through are hit by a Greater Bash.",
        [special("stun_duration", [1.3, 1.6, 1.9, 2.2])],
        { dispellable: 3, immunity: 4 },
      ),
    ]);
    expect(result.disableDuration).toBeCloseTo(2.2 * 0.6, 6);
  });

  it("talent persentase diterapkan ke durasi", () => {
    const result = calculateCrowdControl(
      hero([
        ability(
          "kunkka_torrent",
          "Torrent",
          "Stuns enemies in an area.",
          [special("stun_duration", [1.4])],
          { dispellable: 1, immunity: 4 },
        ),
      ]),
      [talent("kunkka_torrent", "stun_duration", 25, 3)],
    );
    expect(result.disableDuration).toBeCloseTo(1.4 * 1.25 * 0.8 * 0.6, 6);
  });
});

describe("ability yang dikeluarkan dari CC", () => {
  it("Hand of God tidak dihitung", () => {
    const result = cc([
      ability(
        "chen_hand_of_god",
        "Hand of God",
        "Heals all allied heroes. A slow heal over time is applied.",
        [special("hot_duration", [10])],
      ),
    ]);
    expect(result.disableDuration).toBe(0);
    expect(abilitiesOf(result)).toHaveLength(0);
  });

  it("blind dan disarm tidak dihitung", () => {
    const result = cc([
      ability(
        "keeper_of_the_light_blinding_light",
        "Blinding Light",
        "Blinding them, causing them to miss attacks.",
        [special("duration", [4])],
      ),
      ability(
        "invoker_deafening_blast",
        "Deafening Blast",
        "Disarms their attacks.",
        [special("disarm_duration", [5])],
      ),
      ability(
        "enchantress_untouchable",
        "Untouchable",
        "Slowing their attacks when she is attacked.",
        [special("slow_duration", [4])],
      ),
      ability(
        "tinker_laser",
        "Laser",
        "Damaging and blinding the target.",
        [special("duration", [4])],
      ),
    ]);
    expect(result.disableDuration).toBe(0);
    expect(abilitiesOf(result)).toHaveLength(0);
  });

  it("Luna, Dazzle, dan Monkey King tetap dihitung", () => {
    const result = cc([
      ability(
        "luna_eclipse",
        "Eclipse",
        "These beams do not stun their targets.",
        [special("AbilityDuration", [6])],
        { dispellable: 3, immunity: 4 },
      ),
      ability(
        "dazzle_nothl_projection",
        "Nothl Projection",
        "Poison Touch hexes enemies while active.",
        [special("max_duration", [12])],
        { dispellable: 3, immunity: 0 },
      ),
      ability(
        "monkey_king_tree_dance",
        "Tree Dance",
        "If the tree is destroyed, he falls and is stunned.",
        [special("unperched_stunned_duration", [3])],
      ),
    ]);
    expect(result.disableDuration).toBeGreaterThan(0);
    expect(abilitiesOf(result)).toHaveLength(3);
  });
});
