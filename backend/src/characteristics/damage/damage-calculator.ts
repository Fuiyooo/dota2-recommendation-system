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
  talentBonusForValue,
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
      const bonus = 25 + 1.5 * (TARGET.heroLevel - 1) + 12;
      value = bonus * attacks;
      type = "Pure";
      note = `Desolate ${bonus} pure per hit.`;
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
  return maxValue(value) + talentBonusForValue(ability.abilityKey, name, talents);
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

  let raw = maxValue(chosen) + talentBonusForValue(
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

export function calculateDamage(
  hero: HeroData,
  attributes: AttributesResult,
  talents: AbilityData[],
  profile: DamageProfile = DEFAULT_DAMAGE_PROFILE,
  profileMissing = false,
): DamageCalculation {
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
