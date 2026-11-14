import { TARGET } from "../config";
import type {
  AbilityData,
  CalculationStatus,
  HeroData,
} from "../types";
import type { AttributesResult } from "../shared/attribute-calculator";
import {
  DEFAULT_DAMAGE_PROFILE,
  countsBasicAttack,
  type DamageProfile,
} from "../../damage-profile/damage-profile.types";
import {
  descriptionOf,
  findValue,
  isAttackModifier,
  maxValue,
  specialValuesOf,
  talentAdjustedValue,
} from "../shared/special-values";

export interface DamageCalculation {
  physical: number;
  magic: number;
  pure: number;
  status: CalculationStatus;
  detail: Record<string, unknown>;
}

const EXCLUDED_DAMAGE_PARTS = [
  "pct",
  "percent",
  "duration",
  "delay",
  "interval",
  "cooldown",
  "radius",
  "range",
  "cost",
  "mana",
  "health",
  "threshold",
  "resistance",
  "reduction",
  "amp",
  "aoe",
  "slow",
  "stun",
  "count",
  "jump",
  "bonus",
  "talent",
  "illusion",
  "per_soul",
  "per_stack",
  "absorb",
  "rate",
];

const DAMAGE_EXCLUDED = new Set<string>([
  "abyssal_underlord_atrophy_aura",
  "alchemist_corrosive_weaponry",
  "ancient_apparition_bone_chill",
  "axe_culling_blade",
  "bloodseeker_bloodrage",
  "bloodseeker_sanguivore",
  "brewmaster_drunken_brawler",
  "faceless_void_time_dilation",
  "invoker_emp",
  "kez_kazurai_katana",
  "largo_croak_of_genius",
  "mirana_celestial_quiver",
  "obsidian_destroyer_arcane_orb",
  "riki_blink_strike",
  "templar_assassin_psi_blades",
  "tiny_grow",
  "tiny_toss_tree",
  "tusk_tag_team",
  "sven_great_cleave",
  "enigma_demonic_conversion",
  "beastmaster_summon_razorback",
  "beastmaster_summon_raptor",
]);

const BASIC_ATTACK_HANDLED = new Set<string>([
  "bounty_hunter_jinada",
  "broodmother_incapacitating_bite",
  "broodmother_insatiable_hunger",
  "clinkz_searing_arrows",
  "invoker_alacrity",
  "life_stealer_feast",
  "marci_bodyguard",
  "monkey_king_jingu_mastery",
  "muerta_pierce_the_veil",
  "night_stalker_darkness",
  "silencer_glaives_of_wisdom",
  "spectre_desolate",
  "templar_assassin_meld",
  "templar_assassin_refraction",
  "tiny_tree_grab",
  "ursa_fury_swipes",
  "weaver_geminate_attack",
  "chaos_knight_chaos_strike",
  "meepo_ransack",
  "sven_gods_strength",
  "sven_wrath_of_god",
  "lycan_feral_impulse",
  "lycan_shapeshift",
  "skeleton_king_mortal_strike",
  "dawnbreaker_luminosity",
  "dawnbreaker_break_of_dawn",
]);

const DAMAGE_AMPS = new Set<string>([
  "bristleback_prickly",
  "undying_flesh_golem",
]);

function basicAttackBonusDamage(
  hero: HeroData,
  attributes: AttributesResult,
  talents: AbilityData[],
  attackCounted: boolean,
): {
  physical: number;
  magical: number;
  pure: number;
  details: Array<Record<string, unknown>>;
} {
  if (!attackCounted) {
    return { physical: 0, magical: 0, pure: 0, details: [] };
  }

  const attacks = attributes.attacksInWindow;
  const average = (attributes.damageMin + attributes.damageMax) / 2;
  let physical = 0;
  let magical = 0;
  let pure = 0;
  const details: Array<Record<string, unknown>> = [];

  for (const ability of hero.abilities) {
    if (!BASIC_ATTACK_HANDLED.has(ability.abilityKey)) continue;
    const key = ability.abilityKey;
    let value = 0;
    let type: "Physical" | "Magical" | "Pure" = "Physical";
    let note = "";

    if (key === "clinkz_searing_arrows") {
      value = valueAtMax(ability, "damage_bonus", talents) * attacks;
      note = "Searing Arrows per hit.";
    } else if (key === "monkey_king_jingu_mastery") {
      value =
        valueAtMax(ability, "bonus_damage", talents) *
        Math.max(0, attacks - 4);
      note = "Jingu Mastery aktif setelah 4 hit.";
    } else if (key === "tiny_tree_grab") {
      const count = valueAtMax(ability, "attack_count", talents);
      value =
        valueAtMax(ability, "bonus_damage", talents) *
        Math.min(attacks, count);
      note = `Tree Grab maksimum ${count} attack.`;
    } else if (key === "ursa_fury_swipes") {
      value =
        (valueAtMax(ability, "damage_per_stack", talents) *
          attacks *
          (attacks + 1)) /
        2;
      note = "Fury Swipes dengan stack bertambah tiap hit.";
    } else if (key === "weaver_geminate_attack") {
      const extra = Math.max(1, valueAtMax(ability, "extra_attack", talents));
      value =
        extra *
        (average + valueAtMax(ability, "bonus_damage", talents));
      note = "Geminate Attack: satu serangan tambahan.";
    } else if (key === "templar_assassin_meld") {
      value = valueAtMax(ability, "bonus_damage", talents);
      note = "Meld satu attack per window.";
    } else if (key === "silencer_glaives_of_wisdom") {
      const pct =
        valueAtMax(ability, "intellect_damage_pct", talents) / 100;
      value = pct * attributes.intelligence * attacks;
      type = "Magical";
      note = "Glaives of Wisdom berbasis INT.";
    } else if (key === "broodmother_incapacitating_bite") {
      value = valueAtMax(ability, "attack_damage", talents) * attacks;
      note = "Incapacitating Bite per hit.";
    } else if (key === "broodmother_insatiable_hunger") {
      const pct = valueAtMax(ability, "bonus_damage", talents) / 100;
      value = pct * average * attacks;
      note = "Insatiable Hunger menambah persentase attack damage.";
    } else if (key === "life_stealer_feast") {
      const pct = valueAtMax(ability, "hp_damage_percent", talents) / 100;
      value = pct * TARGET.targetHp * attacks;
      note = "Feast memakai persentase HP target.";
    } else if (key === "invoker_alacrity") {
      value = valueAtMax(ability, "bonus_damage", talents) * attacks * 0.9;
      note = "Alacrity 9 detik dari window 10 detik.";
    } else if (key === "night_stalker_darkness") {
      value = valueAtMax(ability, "bonus_damage", talents) * attacks;
      note = "Dark Ascension mencakup seluruh window.";
    } else if (key === "marci_bodyguard") {
      value = valueAtMax(ability, "bonus_damage", talents) * attacks;
      note = "Bodyguard bonus damage pasif.";
    } else if (key === "spectre_desolate") {
      const bonus = valueAtMax(ability, "bonus_damage", talents);
      value = bonus * attacks;
      type = "Pure";
      note = `Desolate ${bonus} pure per hit.`;
    } else if (key === "chaos_knight_chaos_strike") {
      const chance = valueAtMax(ability, "chance", talents) / 100;
      const minCrit = valueAtMax(ability, "crit_min", talents) / 100;
      const maxCrit = valueAtMax(ability, "crit_max", talents) / 100;
      const multiplier = (minCrit + maxCrit) / 2;
      if (chance > 0 && multiplier > 1) {
        value = average * attacks * chance * (multiplier - 1);
        note = `Chaos Strike crit ${chance * 100}% dengan multiplier ${multiplier.toFixed(2)}.`;
      }
    } else if (key === "meepo_ransack") {
      value = valueAtMax(ability, "health_steal_heroes", talents) * attacks;
      note = "Ransack per hit.";
    } else if (key === "sven_gods_strength") {
      const bonus = valueAtMax(ability, "gods_strength_damage", talents) / 100;
      value = average * attacks * bonus;
      note = `God's Strength +${bonus * 100}% attack damage.`;
    } else if (key === "sven_wrath_of_god") {
      const perStrength = valueAtMax(ability, "bonus_damage_per_str", talents);
      value = attributes.strength * perStrength * attacks;
      note = `Wrath of God ${perStrength} damage per STR.`;
    } else if (key === "lycan_feral_impulse") {
      value = valueAtMax(ability, "bonus_damage", talents) * attacks;
      note = "Feral Impulse per hit.";
    } else if (key === "lycan_shapeshift") {
      const chance = valueAtMax(ability, "crit_chance", talents) / 100;
      const multiplier = valueAtMax(ability, "crit_multiplier", talents) / 100;
      if (chance > 0 && multiplier > 1) {
        value = average * attacks * chance * (multiplier - 1);
        note = `Shapeshift crit ${chance * 100}% dengan multiplier ${multiplier}.`;
      }
    } else if (key === "skeleton_king_mortal_strike") {
      const chance = 0.2;
      const multiplier = valueAtMax(ability, "crit_mult", talents) / 100;
      if (multiplier > 1) {
        value = average * attacks * chance * (multiplier - 1);
        note = `Mortal Strike crit 20% dengan multiplier ${multiplier}.`;
      }
    } else if (key === "dawnbreaker_luminosity") {
      const bonus = valueAtMax(ability, "bonus_damage", talents);
      const fireWreath = hero.abilities.find(
        (item) => item.abilityKey === "dawnbreaker_fire_wreath",
      );
      const swings = fireWreath
        ? valueAtMax(fireWreath, "total_attacks", talents)
        : 0;
      const procs = Math.floor((attacks + swings) / 3);
      value = bonus * procs;
      note = `Luminosity ${procs} proc x ${bonus}, termasuk ${swings} putaran Starbreaker.`;
    } else if (key === "dawnbreaker_break_of_dawn") {
      const pct = valueAtMax(ability, "max_dmg_pct", talents) / 100;
      value = average * attacks * pct;
      note = `Break of Dawn ${pct * 100}% bonus damage, asumsi siang penuh.`;
    } else if (key === "templar_assassin_refraction") {
      value = valueAtMax(ability, "bonus_damage", talents) * attacks;
      note = "Refraction bonus damage per hit.";
    } else if (key === "bounty_hunter_jinada") {
      const cooldown =
        valueAtMax(ability, "AbilityCooldown", talents) || 3;
      const uses = Math.max(
        1,
        Math.floor(TARGET.attackWindowSeconds / cooldown),
      );
      value = valueAtMax(ability, "bonus_damage", talents) * uses;
      note = `Jinada ${uses} kali dalam window.`;
    } else if (key === "muerta_pierce_the_veil") {
      const pct =
        valueAtMax(ability, "base_damage_percent", talents) / 100;
      value = pct * average * Math.floor(attacks * 0.8);
      type = "Magical";
      note = "Pierce the Veil 8 detik dari window 10 detik.";
    }

    if (value <= 0) continue;
    if (type === "Physical") physical += value;
    else if (type === "Magical") magical += value;
    else pure += value;
    details.push({
      ability: ability.displayName,
      type,
      value,
      note,
      custom: true,
    });
  }

  return { physical, magical, pure, details };
}

function valueAtMax(ability: AbilityData, name: string, talents: AbilityData[]): number {
  const value = findValue(ability, [name]);
  if (!value) return 0;
  return talentAdjustedValue(
    maxValue(value),
    ability.abilityKey,
    name,
    talents,
  );
}

function calculateManaBreak(
  hero: HeroData,
  attributes: AttributesResult,
  talents: AbilityData[],
): { damage: number; detail: Record<string, unknown> | null } {
  const ability = hero.abilities.find(
    (item) =>
      item.abilityKey === "antimage_mana_break" ||
      (item.abilityType !== "Talent" &&
        findValue(item, ["percent_damage_per_burn"]) !== undefined),
  );
  if (!ability) return { damage: 0, detail: null };

  const manaPerHit = valueAtMax(ability, "mana_per_hit", talents);
  const manaPerHitPct = valueAtMax(ability, "mana_per_hit_pct", talents);
  const percent = valueAtMax(ability, "percent_damage_per_burn", talents);

  let currentMana = TARGET.targetMana;
  let damage = 0;
  const hits: number[] = [];

  for (let index = 0; index < attributes.attacksInWindow; index += 1) {
    const burn = Math.min(
      currentMana,
      manaPerHit + (manaPerHitPct / 100) * TARGET.targetMana,
    );
    const hitDamage = burn * (percent / 100);
    damage += hitDamage;
    hits.push(hitDamage);
    currentMana = Math.max(0, currentMana - burn);
  }

  return {
    damage,
    detail: {
      ability: ability.displayName,
      manaPerHit,
      manaPerHitPct,
      percent,
      attacks: attributes.attacksInWindow,
      targetMana: TARGET.targetMana,
      firstHits: hits.slice(0, 5),
      total: damage,
    },
  };
}

function customAttackModifierDamage(
  ability: AbilityData,
  averageDamage: number,
  attacksInWindow: number,
  talents: AbilityData[],
): { type: "Magical" | "Physical" | "Pure"; value: number; note: string } | null {
  const key = ability.abilityKey;

  if (key === "juggernaut_blade_dance") {
    const chance =
      valueAtMax(ability, "blade_dance_crit_chance", talents) / 100;
    const multiplier =
      valueAtMax(ability, "blade_dance_crit_mult", talents) / 100;
    if (chance <= 0 || multiplier <= 1) return null;
    const value =
      averageDamage * attacksInWindow * chance * (multiplier - 1);
    return {
      type: "Physical",
      value,
      note: `Crit ${chance * 100}% dengan multiplier ${multiplier}.`,
    };
  }

  if (key === "enchantress_impetus") {
    const percent = valueAtMax(ability, "distance_damage_pct", talents) / 100;
    if (percent <= 0) return null;
    const distance = 575;
    return {
      type: "Pure",
      value: percent * distance * attacksInWindow,
      note: `Impetus ${percent * 100}% x ${distance} unit x ${attacksInWindow} serangan.`,
    };
  }

  if (key === "huskar_burning_spear") {
    const burn = valueAtMax(ability, "burn_damage", talents);
    const duration = valueAtMax(ability, "duration", talents);
    if (burn <= 0 || duration <= 0) return null;
    return {
      type: "Magical",
      value: burn * duration,
      note: `Burning Spear 1 stack, ${burn} per detik x ${duration} detik.`,
    };
  }

  if (key === "jakiro_liquid_fire") {
    const damage = valueAtMax(ability, "damage", talents);
    const tickRate = valueAtMax(ability, "tick_rate", talents);
    const duration = valueAtMax(ability, "AbilityDuration", talents);
    if (damage <= 0 || tickRate <= 0 || duration <= 0) return null;
    const ticks = Math.max(1, Math.floor(duration / tickRate));
    return {
      type: "Magical",
      value: damage * ticks,
      note: `Liquid Fire 1 aplikasi, ${ticks} tick.`,
    };
  }

  if (key === "winter_wyvern_arctic_burn") {
    const percent = valueAtMax(ability, "percent_damage", talents) / 100;
    if (percent <= 0) return null;
    const attacks = 5;
    return {
      type: "Magical",
      value: percent * TARGET.targetHp * attacks,
      note: `Arctic Burn ${percent * 100}% x ${TARGET.targetHp} HP x ${attacks} serangan.`,
    };
  }

  if (key === "muerta_gunslinger") {
    const chance =
      valueAtMax(ability, "double_shot_chance", talents) / 100;
    if (chance <= 0) return null;
    return {
      type: "Physical",
      value: averageDamage * attacksInWindow * chance,
      note: `Gunslinger ${chance * 100}% peluang tembakan kedua.`,
    };
  }

  return null;
}

function customAbilityDamage(
  hero: HeroData,
  ability: AbilityData,
  averageDamage: number,
  talents: AbilityData[],
): { type: "Magical" | "Physical" | "Pure"; value: number; note: string } | null {
  if (ability.abilityKey === "leshrac_pulse_nova") {
    const perPulse = valueAtMax(ability, "damage", talents);
    const ticks = 8;
    return {
      type: "Magical",
      value: perPulse * ticks,
      note: `${ability.displayName}: ${ticks} pulse.`,
    };
  }

  if (ability.abilityKey === "leshrac_diabolic_edict") {
    const perExplosion = valueAtMax(ability, "damage", talents);
    const ticks = 32;
    return {
      type: "Pure",
      value: perExplosion * ticks,
      note: `${ability.displayName}: ${ticks} explosion.`,
    };
  }

  if (ability.abilityKey === "zuus_static_field") {
    const percent = valueAtMax(ability, "damage_health_pct", talents);
    let currentHp = TARGET.targetHp;
    let total = 0;
    const procs = 4;
    for (let index = 0; index < procs; index += 1) {
      const hit = currentHp * (percent / 100);
      total += hit;
      currentHp -= hit;
    }
    return {
      type: "Magical",
      value: total,
      note: `${ability.displayName}: ${procs} proc, HP target menurun berurutan.`,
    };
  }

  if (ability.abilityKey === "snapfire_lil_shredder") {
    const fixed = valueAtMax(ability, "damage", talents);
    const percent = valueAtMax(ability, "damage_pct", talents) / 100;
    const attacks = Math.max(
      1,
      valueAtMax(ability, "buffed_attacks", talents),
    );
    return {
      type: "Physical",
      value: attacks * (fixed + percent * averageDamage),
      note: `${attacks} attack, ${fixed} + ${percent * 100}% attack damage.`,
    };
  }

  if (ability.abilityKey === "mars_gods_rebuke") {
    const crit = valueAtMax(ability, "crit_mult", talents) / 100;
    const bonus = valueAtMax(ability, "bonus_damage_vs_heroes", talents);
    if (crit <= 0) return null;
    return {
      type: "Physical",
      value: averageDamage * crit + bonus,
      note: `Critical ${crit}x attack damage + ${bonus}.`,
    };
  }

  if (ability.abilityKey === "ember_spirit_sleight_of_fist") {
    const bonus = valueAtMax(ability, "bonus_hero_damage", talents);
    return {
      type: "Physical",
      value: bonus + averageDamage,
      note: `1 target, bonus ${bonus} + attack damage.`,
    };
  }

  if (ability.abilityKey === "abaddon_aphotic_shield") {
    const value = valueAtMax(ability, "damage_absorb", talents);
    return {
      type: "Magical",
      value,
      note: "Damage mengikuti besar shield.",
    };
  }

  if (ability.abilityKey === "bounty_hunter_shuriken_toss") {
    const value = valueAtMax(ability, "bonus_damage", talents);
    return {
      type: "Magical",
      value,
      note: "Damage memakai nilai bonus_damage.",
    };
  }

  if (ability.abilityKey === "bristleback_quill_spray") {
    const base = valueAtMax(ability, "quill_base_damage", talents);
    const stack = valueAtMax(ability, "quill_stack_damage", talents);
    const value = base + 7 * stack;
    return {
      type: "Physical",
      value,
      note: "Quill Spray base + 7 stack.",
    };
  }

  if (ability.abilityKey === "drow_ranger_multishot") {
    const waves = valueAtMax(ability, "wave_count", talents);
    const pct = valueAtMax(ability, "arrow_damage_pct", talents) / 100;
    const value = waves * pct * averageDamage;
    return {
      type: "Physical",
      value,
      note: `Multishot ${waves} wave x ${pct * 100}% attack damage.`,
    };
  }

  if (ability.abilityKey === "kez_raptor_dance") {
    const strikes = valueAtMax(ability, "strikes", talents);
    const pct = valueAtMax(ability, "max_health_damage_pct", talents) / 100;
    const value = strikes * pct * TARGET.targetHp;
    return {
      type: "Pure",
      value,
      note: `${strikes} strike x ${pct * 100}% HP target.`,
    };
  }

  if (ability.abilityKey === "nyx_assassin_jolt") {
    const pct = valueAtMax(ability, "max_mana_as_damage_pct", talents) / 100;
    const value = TARGET.targetMana * pct;
    return {
      type: "Magical",
      value,
      note: `${pct * 100}% max mana target.`,
    };
  }

  if (ability.abilityKey === "nyx_assassin_vendetta") {
    const value = valueAtMax(ability, "bonus_damage", talents);
    return {
      type: "Pure",
      value,
      note: "Vendetta bonus damage.",
    };
  }

  if (ability.abilityKey === "omniknight_purification") {
    const value = valueAtMax(ability, "heal", talents);
    return {
      type: "Pure",
      value,
      note: "Purification heal/damage.",
    };
  }

  if (ability.abilityKey === "necrolyte_reapers_scythe") {
    const perHealth = valueAtMax(ability, "damage_per_health", talents);
    const missingHp = TARGET.targetHp * 0.5;
    const value = perHealth * missingHp;
    return {
      type: "Magical",
      value,
      note: `Reaper's Scythe 50% missing HP (${missingHp}) x ${perHealth}.`,
    };
  }

  if (ability.abilityKey === "antimage_mana_void") {
    const perMana = valueAtMax(ability, "mana_void_damage_per_mana", talents);
    const value = perMana * TARGET.targetMana;
    return {
      type: "Magical",
      value,
      note: `Mana Void ${TARGET.targetMana} missing mana x ${perMana}.`,
    };
  }

  if (ability.abilityKey === "chaos_knight_chaos_bolt") {
    const min = valueAtMax(ability, "damage_min", talents);
    const max = valueAtMax(ability, "damage_max", talents);
    const value = (min + max) / 2;
    return {
      type: "Magical",
      value,
      note: `Chaos Bolt rata-rata ${min} dan ${max}.`,
    };
  }

  if (ability.abilityKey === "meepo_poof") {
    const damage = valueAtMax(ability, "poof_damage", talents);
    const divided = hero.abilities.find(
      (item) => item.abilityKey === "meepo_divided_we_stand",
    );
    const clones = divided
      ? valueAtMax(divided, "tooltip_clones", talents)
      : 0;
    const meepos = 1 + clones;
    return {
      type: "Magical",
      value: damage * meepos,
      note: `Poof ${meepos} Meepo x ${damage}.`,
    };
  }

  if (ability.abilityKey === "wisp_spirits") {
    const damage = valueAtMax(ability, "hero_damage", talents);
    const spirits = valueAtMax(ability, "spirit_amount", talents);
    const revolutions = Math.floor(
      TARGET.attackWindowSeconds /
        Math.max(1, valueAtMax(ability, "revolution_time", talents)),
    );
    const hits = Math.max(1, revolutions);
    return {
      type: "Magical",
      value: damage * spirits * hits,
      note: `${spirits} spirit x ${hits} putaran x ${damage}.`,
    };
  }

  if (ability.abilityKey === "abyssal_underlord_firestorm") {
    const waves = valueAtMax(ability, "wave_count", talents);
    const damage = valueAtMax(ability, "wave_damage", talents);
    return {
      type: "Magical",
      value: waves * damage,
      note: `Firestorm ${waves} wave x ${damage}.`,
    };
  }

  if (ability.abilityKey === "abyssal_underlord_pit_of_malice") {
    const damage = valueAtMax(ability, "pit_damage", talents);
    const interval = valueAtMax(ability, "pit_interval", talents);
    const duration = Math.min(
      TARGET.attackWindowSeconds,
      valueAtMax(ability, "pit_duration", talents),
    );
    const ticks =
      interval > 0 ? Math.max(1, Math.floor(duration / interval) + 1) : 1;
    return {
      type: "Magical",
      value: damage * ticks,
      note: `Pit of Malice ${ticks} tick x ${damage}.`,
    };
  }

  if (ability.abilityKey === "enigma_malefice") {
    const damage = valueAtMax(ability, "damage", talents);
    const instances = 3;
    return {
      type: "Magical",
      value: damage * instances,
      note: `Malefice ${instances} instance x ${damage}.`,
    };
  }

  if (ability.abilityKey === "enigma_midnight_pulse") {
    const base = valueAtMax(ability, "base_damage", talents);
    const percent = valueAtMax(ability, "damage_percent", talents) / 100;
    const tickRate = valueAtMax(ability, "tick_rate", talents);
    const duration = Math.min(
      TARGET.attackWindowSeconds,
      valueAtMax(ability, "duration", talents),
    );
    const ticks =
      tickRate > 0 ? Math.max(1, Math.floor(duration / tickRate)) : 1;
    let currentHp = TARGET.targetHp;
    let total = 0;
    for (let index = 0; index < ticks; index += 1) {
      const hit = base + percent * currentHp;
      total += hit;
      currentHp -= hit;
    }
    return {
      type: "Magical",
      value: total,
      note: `Midnight Pulse ${ticks} tick, base ${base} + ${percent * 100}% HP terkini.`,
    };
  }

  if (ability.abilityKey === "enigma_black_hole") {
    const dps = valueAtMax(ability, "damage", talents);
    const duration = valueAtMax(ability, "duration", talents);
    return {
      type: "Pure",
      value: dps * duration,
      note: `Black Hole ${dps} per detik x ${duration} detik.`,
    };
  }

  if (ability.abilityKey === "dawnbreaker_fire_wreath") {
    const swings = valueAtMax(ability, "total_attacks", talents);
    const bonus = valueAtMax(ability, "smash_damage", talents);
    return {
      type: "Physical",
      value: swings * (averageDamage + bonus),
      note: `Starbreaker ${swings} putaran x (attack + ${bonus}).`,
    };
  }

  if (ability.abilityKey === "razor_eye_of_the_storm") {
    const damage = valueAtMax(ability, "damage", talents);
    const interval = valueAtMax(ability, "strike_interval", talents);
    const duration = Math.min(
      TARGET.attackWindowSeconds,
      valueAtMax(ability, "duration", talents),
    );
    const strikes =
      interval > 0 ? Math.max(1, Math.floor(duration / interval)) : 1;
    return {
      type: "Physical",
      value: damage * strikes,
      note: `Eye of the Storm ${strikes} strike x ${damage}.`,
    };
  }

  if (ability.abilityKey === "razor_storm_surge") {
    const damage = valueAtMax(ability, "strike_damage", talents);
    const chance = valueAtMax(ability, "strike_pct_chance", talents) / 100;
    const internal = valueAtMax(ability, "strike_internal_cd", talents);
    const procs =
      internal > 0
        ? (TARGET.attackWindowSeconds / internal) * chance
        : 0;
    return {
      type: "Magical",
      value: damage * procs,
      note: `Storm Surge expected ${procs.toFixed(2)} proc.`,
    };
  }

  if (ability.abilityKey === "luna_eclipse") {
    const lucent = hero.abilities.find(
      (item) => item.abilityKey === "luna_lucent_beam",
    );
    if (!lucent) return null;
    const beamDamage =
      valueAtMax(lucent, "beam_damage", talents) ||
      valueAtMax(lucent, "damage", talents);
    const beams = valueAtMax(ability, "beams", talents);
    return {
      type: "Magical",
      value: beamDamage * beams,
      note: `Eclipse ${beams} beam x ${beamDamage}.`,
    };
  }

  return null;
}

function pickDamageValue(
  ability: AbilityData,
  talents: AbilityData[],
): { value: number; name: string; note?: string } | null {
  const values = specialValuesOf(ability).filter((value) => {
    if (value.values.length === 0) return false;
    const name = value.name.toLowerCase();
    if (!name.includes("damage") && !name.includes("dps")) return false;
    return !EXCLUDED_DAMAGE_PARTS.some((part) => name.includes(part));
  });

  if (values.length === 0) return null;

  const exact = values.find((value) => value.name === "damage");
  const chosen =
    exact ??
    [...values].sort((left, right) => maxValue(right) - maxValue(left))[0];

  let raw = talentAdjustedValue(
    maxValue(chosen),
    ability.abilityKey,
    chosen.name,
    talents,
  );
  if (raw <= 0) return null;
  const notes: string[] = [];

  if (
    chosen.name.includes("per_second") ||
    chosen.name.includes("per_sec") ||
    chosen.name.includes("dps")
  ) {
    const duration = findValue(ability, [
      "duration",
      "abilityduration",
      "AbilityDuration",
      "AbilityChannelTime",
    ]);
    const seconds = duration ? maxValue(duration) : 0;
    raw *= seconds;
    notes.push(`DoT ${seconds} detik.`);
  } else if (
    chosen.name.includes("tick") ||
    chosen.name.includes("pulse") ||
    chosen.name.includes("explosion")
  ) {
    const duration = findValue(ability, [
      "duration",
      "abilityduration",
      "AbilityDuration",
      "AbilityChannelTime",
    ]);
    const interval = findValue(ability, [
      "interval",
      "tick_interval",
      "damage_interval",
      "explosion_interval",
      "damage_tick_rate",
    ]);
    const count = findValue(ability, [
      "tick_count",
      "ticks",
      "pulses",
      "explosions",
    ]);
    const ticks =
      count !== undefined
        ? maxValue(count)
        : duration && interval
          ? Math.max(1, Math.floor(maxValue(duration) / maxValue(interval)))
          : 1;
    raw *= ticks;
    notes.push(`${ticks} tick.`);
  } else {
    const instances = findValue(ability, ["instances", "hits"]);
    if (instances) {
      raw *= Math.max(1, maxValue(instances));
      notes.push(`${maxValue(instances)} instance.`);
    }
  }

  return {
    value: raw,
    name: chosen.name,
    note: notes.join(" "),
  };
}

function attacksWithin(
  attributes: AttributesResult,
  seconds: number,
): number {
  if (attributes.attackInterval <= 0) return 0;
  let count = 0;
  let time = 0;
  while (time + attributes.attackPoint <= seconds + 1e-9) {
    count += 1;
    time += attributes.attackInterval;
  }
  return count;
}

function multiUnitAttackDamage(
  hero: HeroData,
  attributes: AttributesResult,
  attackCounted: boolean,
  averageDamage: number,
  talents: AbilityData[],
): {
  physical: number;
  magical: number;
  pure: number;
  details: Array<Record<string, unknown>>;
} {
  if (!attackCounted) {
    return { physical: 0, magical: 0, pure: 0, details: [] };
  }

  let physical = 0;
  let magical = 0;
  let pure = 0;
  const details: Array<Record<string, unknown>> = [];
  const attacks = attributes.attacksInWindow;

  const divided = hero.abilities.find(
    (ability) => ability.abilityKey === "meepo_divided_we_stand",
  );
  if (divided) {
    const clones = valueAtMax(divided, "tooltip_clones", talents);
    const ransack = hero.abilities.find(
      (ability) => ability.abilityKey === "meepo_ransack",
    );
    const ransackPerHit = ransack
      ? valueAtMax(ransack, "health_steal_heroes", talents)
      : 0;
    const value = clones * (averageDamage + ransackPerHit) * attacks;
    physical += value;
    details.push({
      ability: "Divided We Stand",
      type: "Physical",
      value,
      note: `${clones} clone x ${attacks} serangan, tanpa penalti item.`,
      custom: true,
    });
  }

  const haunt = hero.abilities.find(
    (ability) => ability.abilityKey === "spectre_haunt",
  );
  if (haunt) {
    const illusions = 5;
    const outgoing = valueAtMax(haunt, "tooltip_outgoing", talents) / 100;
    const duration = valueAtMax(haunt, "duration", talents);
    const illusionAttacks = attacksWithin(attributes, duration);
    const desolate = hero.abilities.find(
      (ability) => ability.abilityKey === "spectre_desolate",
    );
    const desolateBonus = desolate
      ? valueAtMax(desolate, "bonus_damage", talents)
      : 0;
    const physicalValue =
      illusions * illusionAttacks * averageDamage * outgoing;
    const pureValue =
      illusions * illusionAttacks * desolateBonus * outgoing;
    physical += physicalValue;
    pure += pureValue;
    details.push({
      ability: "Haunt",
      type: "Physical",
      value: physicalValue,
      note: `${illusions} illusion, ${illusionAttacks} serangan, ${outgoing * 100}% damage.`,
      custom: true,
    });
    if (pureValue > 0) {
      details.push({
        ability: "Haunt Desolate",
        type: "Pure",
        value: pureValue,
        note: `Desolate illusion ${illusions} x ${illusionAttacks} serangan.`,
        custom: true,
      });
    }
  }

  const phantasm = hero.abilities.find(
    (ability) => ability.abilityKey === "chaos_knight_phantasm",
  );
  if (phantasm) {
    const images = valueAtMax(phantasm, "images_count", talents);
    const outgoing =
      valueAtMax(phantasm, "outgoing_damage_tooltip", talents) / 100;
    const chaosStrike = hero.abilities.find(
      (ability) => ability.abilityKey === "chaos_knight_chaos_strike",
    );
    let critBonus = 0;
    if (chaosStrike) {
      const chance = valueAtMax(chaosStrike, "chance", talents) / 100;
      const minCrit = valueAtMax(chaosStrike, "crit_min", talents) / 100;
      const maxCrit = valueAtMax(chaosStrike, "crit_max", talents) / 100;
      const multiplier = (minCrit + maxCrit) / 2;
      if (chance > 0 && multiplier > 1) {
        critBonus = averageDamage * chance * (multiplier - 1);
      }
    }
    const value = images * outgoing * (averageDamage + critBonus) * attacks;
    physical += value;
    details.push({
      ability: "Phantasm",
      type: "Physical",
      value,
      note: `${images} illusion x ${attacks} serangan, ${outgoing * 100}% damage.`,
      custom: true,
    });
  }

  const mirrorImage = hero.abilities.find(
    (ability) => ability.abilityKey === "naga_siren_mirror_image",
  );
  if (mirrorImage) {
    const images = valueAtMax(mirrorImage, "images_count", talents);
    const outgoing =
      valueAtMax(mirrorImage, "outgoing_damage_tooltip", talents) / 100;
    const duration = valueAtMax(mirrorImage, "illusion_duration", talents);
    const illusionAttacks = attacksWithin(
      attributes,
      Math.min(TARGET.attackWindowSeconds, duration),
    );
    const value = images * outgoing * averageDamage * illusionAttacks;
    physical += value;
    details.push({
      ability: "Mirror Image",
      type: "Physical",
      value,
      note: `${images} illusion x ${illusionAttacks} serangan, ${outgoing * 100}% damage.`,
      custom: true,
    });
  }

  const juxtapose = hero.abilities.find(
    (ability) => ability.abilityKey === "phantom_lancer_juxtapose",
  );
  if (juxtapose) {
    const illusions = 5;
    const outgoing =
      valueAtMax(juxtapose, "tooltip_illusion_damage", talents) / 100;
    const duration = valueAtMax(juxtapose, "illusion_duration", talents);
    const illusionAttacks = attacksWithin(
      attributes,
      Math.min(TARGET.attackWindowSeconds, duration),
    );
    const value = illusions * outgoing * averageDamage * illusionAttacks;
    physical += value;
    details.push({
      ability: "Juxtapose",
      type: "Physical",
      value,
      note: `${illusions} illusion diasumsikan aktif, ${illusionAttacks} serangan, ${outgoing * 100}% damage.`,
      custom: true,
    });
  }

  const doppelganger = hero.abilities.find(
    (ability) => ability.abilityKey === "phantom_lancer_doppelwalk",
  );
  if (doppelganger) {
    const amount = valueAtMax(doppelganger, "illusion_2_amount", talents);
    const reduction =
      Math.abs(valueAtMax(doppelganger, "illusion_2_damage_out_pct", talents)) /
      100;
    const outgoing = Math.max(0, 1 - reduction);
    const duration = valueAtMax(doppelganger, "illusion_duration", talents);
    const illusionAttacks = attacksWithin(
      attributes,
      Math.min(TARGET.attackWindowSeconds, duration),
    );
    const value = amount * outgoing * averageDamage * illusionAttacks;
    physical += value;
    details.push({
      ability: "Doppelganger",
      type: "Physical",
      value,
      note: `${amount} illusion x ${illusionAttacks} serangan, ${outgoing * 100}% damage.`,
      custom: true,
    });
  }

  const spiritBear = hero.abilities.find(
    (ability) => ability.abilityKey === "lone_druid_spirit_bear",
  );
  if (spiritBear) {
    const bearBat = valueAtMax(spiritBear, "bear_bat", talents) || 1.5;
    const agilityGain = valueAtMax(
      spiritBear,
      "agility_gain_tooltip",
      talents,
    );
    const bearAgility = agilityGain * (TARGET.heroLevel - 1);
    const attackSpeed = 100 + bearAgility;
    const interval = attackSpeed > 0 ? (100 * bearBat) / attackSpeed : 0;
    let bearAttacks = 0;
    let time = 0;
    while (
      interval > 0 &&
      time + attributes.attackPoint <= TARGET.attackWindowSeconds + 1e-9
    ) {
      bearAttacks += 1;
      time += interval;
    }
    const value = averageDamage * bearAttacks;
    physical += value;
    details.push({
      ability: "Spirit Bear",
      type: "Physical",
      value,
      note: `${bearAttacks} serangan, BAT ${bearBat}, damage per hit memakai average Druid.`,
      custom: true,
    });
  }

  const boar = hero.abilities.find(
    (ability) => ability.abilityKey === "beastmaster_summon_razorback",
  );
  if (boar) {
    const damage = valueAtMax(boar, "boar_base_damage", talents);
    const bat = 1.35;
    let boarAttacks = 0;
    let boarTime = 0;
    while (boarTime + 0.675 <= TARGET.attackWindowSeconds + 1e-9) {
      boarAttacks += 1;
      boarTime += bat;
    }
    const value = damage * boarAttacks;
    physical += value;
    details.push({
      ability: "Summon Razorback",
      type: "Physical",
      value,
      note: `1 boar x ${boarAttacks} serangan x ${damage}, BAT 1,35 dari file unit.`,
      custom: true,
    });
  }

  const raptors = hero.abilities.find(
    (ability) => ability.abilityKey === "beastmaster_summon_raptor",
  );
  if (raptors) {
    const count = valueAtMax(raptors, "hawk_count", talents);
    const diveDamage = valueAtMax(raptors, "dive_damage", talents);
    const interval = valueAtMax(raptors, "hawk_base_attack_interval", talents);
    const dives =
      interval > 0
        ? Math.floor(TARGET.attackWindowSeconds / interval) + 1
        : 1;
    const value = count * dives * diveDamage;
    magical += value;
    details.push({
      ability: "Summon Raptors",
      type: "Magical",
      value,
      note: `${count} raptor x ${dives} dive x ${diveDamage}.`,
      custom: true,
    });
  }

  const wolves = hero.abilities.find(
    (ability) => ability.abilityKey === "lycan_summon_wolves",
  );
  if (wolves) {
    const count = valueAtMax(wolves, "wolf_count", talents);
    const damage = valueAtMax(wolves, "wolf_damage", talents);
    const bat = valueAtMax(wolves, "wolf_bat", talents) || 1;
    let wolfAttacks = 0;
    let wolfTime = 0;
    while (
      wolfTime + 0.3 <= TARGET.attackWindowSeconds + 1e-9
    ) {
      wolfAttacks += 1;
      wolfTime += bat;
    }
    const value = count * damage * wolfAttacks;
    physical += value;
    details.push({
      ability: "Summon Wolves",
      type: "Physical",
      value,
      note: `${count} wolf x ${wolfAttacks} serangan x ${damage}.`,
      custom: true,
    });
  }

  const skeletons = hero.abilities.find(
    (ability) => ability.abilityKey === "skeleton_king_bone_guard",
  );
  if (skeletons) {
    const count = valueAtMax(skeletons, "max_skeleton_charges", talents);
    const damage = valueAtMax(
      skeletons,
      "skeleton_damage_tooltip",
      talents,
    );
    let skeletonAttacks = 0;
    let skeletonTime = 0;
    while (
      skeletonTime + 0.672 <= TARGET.attackWindowSeconds + 1e-9
    ) {
      skeletonAttacks += 1;
      skeletonTime += 1.2;
    }
    const value = count * damage * skeletonAttacks;
    physical += value;
    details.push({
      ability: "Bone Guard",
      type: "Physical",
      value,
      note: `${count} skeleton x ${skeletonAttacks} serangan x ${damage}, BAT 1,2 dari file unit.`,
      custom: true,
    });
  }

  return { physical, magical, pure, details };
}

function essenceShiftBonus(
  hero: HeroData,
  attributes: AttributesResult,
  averageDamage: number,
  talents: AbilityData[],
): { value: number; note: string } | null {
  const ability = hero.abilities.find(
    (item) => item.abilityKey === "slark_essence_shift",
  );
  if (!ability) return null;

  const perStack = valueAtMax(ability, "agi_gain", talents);
  if (perStack <= 0 || attributes.bat <= 0) return null;

  let attackSpeed = attributes.attackSpeedTotal;
  let stacks = 0;
  let time = 0;
  let total = 0;

  while (time + attributes.attackPoint <= TARGET.attackWindowSeconds + 1e-9) {
    total += averageDamage + stacks * perStack;
    stacks += 1;
    attackSpeed += perStack;
    time += (100 * attributes.bat) / Math.max(1, attackSpeed);
  }

  const staticTotal = averageDamage * attributes.attacksInWindow;
  const value = Math.max(0, total - staticTotal);
  if (value <= 0) return null;

  return {
    value,
    note: `Essence Shift ${perStack} agility per hit, ${stacks} stack dalam window.`,
  };
}

function adjustUrsaAttackWindow(
  hero: HeroData,
  attributes: AttributesResult,
  talents: AbilityData[],
): AttributesResult {
  const overpower = hero.abilities.find(
    (ability) => ability.abilityKey === "ursa_overpower",
  );
  if (!overpower || attributes.abilityAttackSpeed <= 0) return attributes;

  const maxAttacks = valueAtMax(overpower, "max_attacks", talents);
  if (maxAttacks <= 0) return attributes;

  const bonus = attributes.abilityAttackSpeed;
  const baseAttackSpeed = Math.max(1, attributes.attackSpeedTotal - bonus);
  let time = 0;
  let attacks = 0;
  let empowered = 0;

  while (time + attributes.attackPoint <= TARGET.attackWindowSeconds + 1e-9) {
    const attackSpeed =
      baseAttackSpeed + (empowered < maxAttacks ? bonus : 0);
    attacks += 1;
    empowered += 1;
    time += (100 * attributes.bat) / Math.max(1, attackSpeed);
  }

  return { ...attributes, attacksInWindow: attacks, attackSpeedTotal: baseAttackSpeed };
}

export function calculateDamage(
  hero: HeroData,
  attributes: AttributesResult,
  talents: AbilityData[],
  profile: DamageProfile = DEFAULT_DAMAGE_PROFILE,
  profileMissing = false,
): DamageCalculation {
  attributes = adjustUrsaAttackWindow(hero, attributes, talents);

  const unsupported: string[] = [];
  const abilityDetails: Array<Record<string, unknown>> = [];
  const averageDamage = (attributes.damageMin + attributes.damageMax) / 2;
  const attackCounted = countsBasicAttack(profile);
  const basicDamage = attackCounted
    ? averageDamage * attributes.attacksInWindow
    : 0;
  const basicBonus = basicAttackBonusDamage(
    hero,
    attributes,
    talents,
    attackCounted,
  );
  const manaBreak = attackCounted
    ? calculateManaBreak(hero, attributes, talents)
    : { damage: 0, detail: null };

  if (!attackCounted) {
    abilityDetails.push({
      ability: "Basic attack",
      type: "Physical",
      value: 0,
      note: `Tidak dihitung: main ${profile.main}, secondary ${profile.secondary}.`,
      excluded: true,
    });
  }
  if (profileMissing) {
    unsupported.push(
      "Profil damage hero belum diisi. Basic attack memakai default PHYSICAL/MAGICAL.",
    );
  }

  let physical = basicDamage + manaBreak.damage + basicBonus.physical;
  let magic = basicBonus.magical;
  let pure = basicBonus.pure;
  abilityDetails.push(...basicBonus.details);

  const multiUnit = multiUnitAttackDamage(
    hero,
    attributes,
    attackCounted,
    averageDamage,
    talents,
  );
  physical += multiUnit.physical;
  magic += multiUnit.magical;
  pure += multiUnit.pure;
  abilityDetails.push(...multiUnit.details);

  const staticLink = hero.abilities.find(
    (ability) => ability.abilityKey === "razor_static_link",
  );
  if (staticLink) {
    const drain = valueAtMax(staticLink, "drain_rate", talents);
    const duration = Math.min(
      TARGET.attackWindowSeconds,
      valueAtMax(staticLink, "drain_duration", talents),
    );
    const averageBonus = (drain * duration) / 2;
    const value = averageBonus * attributes.attacksInWindow;
    if (value > 0) {
      physical += value;
      abilityDetails.push({
        ability: "Static Link",
        type: "Physical",
        value,
        note: `Rata-rata ${averageBonus} damage tambahan per serangan.`,
        custom: true,
      });
    }
  }

  if (attackCounted) {
    const essence = essenceShiftBonus(hero, attributes, averageDamage, talents);
    if (essence) {
      physical += essence.value;
      abilityDetails.push({
        ability: "Essence Shift",
        type: "Physical",
        value: essence.value,
        note: essence.note,
        custom: true,
      });
    }
  }

  for (const ability of hero.abilities) {
    if (ability.abilityType === "Talent") continue;
    if (ability.abilityKey === "antimage_mana_break") continue;
    if (ability.abilityKey === "lina_slow_burn") continue;
    if (DAMAGE_EXCLUDED.has(ability.abilityKey)) continue;
    if (BASIC_ATTACK_HANDLED.has(ability.abilityKey)) continue;
    if (DAMAGE_AMPS.has(ability.abilityKey)) continue;

    if (ability.abilityKey === "elder_titan_earth_splitter") {
      const pct = valueAtMax(ability, "damage_pct", talents) / 100;
      const total = TARGET.targetHp * pct;
      physical += total / 2;
      magic += total / 2;
      abilityDetails.push({
        ability: ability.displayName,
        type: "Magical + Physical",
        value: total,
        note: `${pct * 100}% HP target, dibagi 50% magic dan 50% physical.`,
        custom: true,
      });
      continue;
    }

    if (ability.abilityKey === "storm_spirit_ball_lightning") {
      const maxMana = attributes.maxMana;
      const initial =
        valueAtMax(ability, "ball_lightning_initial_mana_base", talents) +
        (valueAtMax(
          ability,
          "ball_lightning_initial_mana_percentage",
          talents,
        ) /
          100) *
          maxMana;
      const per100 =
        valueAtMax(ability, "ball_lightning_travel_cost_base", talents) +
        (valueAtMax(ability, "ball_lightning_travel_cost_percent", talents) /
          100) *
          maxMana;
      const distance = per100 > 0 ? ((maxMana - initial) / per100) * 100 : 0;
      const per100Damage = valueAtMax(ability, "AbilityDamage", talents);
      const value = per100Damage * (distance / 100);
      magic += value;
      abilityDetails.push({
        ability: ability.displayName,
        type: "Magical",
        value,
        note: `${per100Damage} per 100 unit x ${distance.toFixed(1)} unit.`,
        custom: true,
      });
      continue;
    }

    const attackModifier = customAttackModifierDamage(
      ability,
      averageDamage,
      attributes.attacksInWindow,
      talents,
    );
    if (attackModifier) {
      if (attackModifier.type === "Magical") magic += attackModifier.value;
      if (attackModifier.type === "Physical") physical += attackModifier.value;
      if (attackModifier.type === "Pure") pure += attackModifier.value;
      abilityDetails.push({
        ability: ability.displayName,
        type: attackModifier.type,
        value: attackModifier.value,
        note: attackModifier.note,
        custom: true,
      });
      continue;
    }

    if (isAttackModifier(ability)) {
      unsupported.push(
        `${ability.displayName}: attack modifier belum memiliki handler.`,
      );
      continue;
    }

    const custom = customAbilityDamage(hero, ability, averageDamage, talents);
    if (custom) {
      if (custom.type === "Magical") magic += custom.value;
      if (custom.type === "Physical") physical += custom.value;
      if (custom.type === "Pure") pure += custom.value;
      abilityDetails.push({
        ability: ability.displayName,
        type: custom.type,
        value: custom.value,
        note: custom.note,
        custom: true,
      });
      continue;
    }

    const damageType = ability.damageType;
    if (!damageType) continue;

    const picked = pickDamageValue(ability, talents);
    if (!picked) {
      if (descriptionOf(ability).toLowerCase().includes("damage")) {
        unsupported.push(
          `${ability.displayName}: nilai damage tidak dapat dipastikan dari special value.`,
        );
      }
      continue;
    }

    if (damageType === "Magical") magic += picked.value;
    if (damageType === "Physical") physical += picked.value;
    if (damageType === "Pure") pure += picked.value;

    abilityDetails.push({
      ability: ability.displayName,
      type: damageType,
      value: picked.value,
      specialValue: picked.name,
      note: picked.note ?? "",
    });
  }

  for (const note of attributes.notes) {
    if (note.toLowerCase().includes("attack speed")) {
      unsupported.push(note);
    }
  }

  const slowBurn = hero.abilities.find(
    (ability) => ability.abilityKey === "lina_slow_burn",
  );
  if (slowBurn) {
    const burnPercent = valueAtMax(slowBurn, "burn_damage_pct", talents);
    const burnDuration = valueAtMax(slowBurn, "burn_duration", talents);
    if (burnPercent > 0 && magic > 0) {
      const burnDamage = magic * (burnPercent / 100);
      magic += burnDamage;
      abilityDetails.push({
        ability: slowBurn.displayName,
        type: "Magical",
        value: burnDamage,
        note: `${burnPercent}% burn selama ${burnDuration} detik dari damage ability.`,
        custom: true,
      });
    }
  }

  for (const abilityKey of DAMAGE_AMPS) {
    const ability = hero.abilities.find(
      (item) => item.abilityKey === abilityKey,
    );
    if (!ability) continue;
    const percent =
      abilityKey === "bristleback_prickly"
        ? 0.195
        : valueAtMax(ability, "damage_amp", talents) / 100;
    if (percent <= 0) continue;
    const ampPhysical = physical * percent;
    const ampMagical = magic * percent;
    const ampPure = pure * percent;
    physical += ampPhysical;
    magic += ampMagical;
    pure += ampPure;
    abilityDetails.push({
      ability: ability.displayName,
      type: "Amp",
      value: ampPhysical + ampMagical + ampPure,
      note: `Damage amp ${percent * 100}%.`,
      custom: true,
    });
  }

  const status: CalculationStatus =
    hero.damageMin === null || hero.attackRate === null
      ? "UNSUPPORTED"
      : unsupported.length > 0
        ? "PARTIAL"
        : "SUPPORTED";

  return {
    physical,
    magic,
    pure,
    status,
    detail: {
      damageProfile: profile,
      basicAttack: {
        attacks: attributes.attacksInWindow,
        averageDamage,
        total: basicDamage,
        attackPoint: attributes.attackPoint,
        attackPointSource: attributes.attackPointSource,
        counted: attackCounted,
      },
      manaBreak: manaBreak.detail,
      abilities: abilityDetails,
      unsupported,
      selectedTalents: talents.map((talent) => talent.displayName),
    },
  };
}
