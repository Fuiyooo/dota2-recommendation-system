import type {
  AbilityData,
  CalculationStatus,
  HeroData,
} from "../types";
import type { AttributesResult } from "../shared/attribute-calculator";
import { findValue, maxValue } from "../shared/special-values";

type MovementKind = "blink" | "dash";

interface MovementRule {
  kind: MovementKind;
  fields?: string[];
  allowCastRange?: boolean;
  fixed?: number;
  manaBased?: boolean;
  assumption?: string;
  note?: string;
}

/**
 * Daftar putih ability yang benar-benar memindahkan Hero.
 * Cast range hanya boleh dipakai kalau ability ditandai allowCastRange.
 * Ability di luar daftar ini tidak dihitung sebagai mobility, sekalipun
 * deskripsinya menyebut charge, blink, atau distance.
 */
const MOVEMENT_RULES: Record<string, MovementRule> = {
  antimage_blink: { kind: "blink", allowCastRange: true },
  queenofpain_blink: { kind: "blink", allowCastRange: true },
  morphling_waveform: { kind: "dash", allowCastRange: true },
  sandking_burrowstrike: { kind: "dash", allowCastRange: true },
  riki_blink_strike: { kind: "blink", allowCastRange: true },
  phantom_assassin_phantom_strike: { kind: "blink", allowCastRange: true },
  spectre_shadow_step: { kind: "blink", allowCastRange: true },
  huskar_life_break: { kind: "dash", allowCastRange: true },
  tusk_snowball: { kind: "dash", allowCastRange: true },
  ember_spirit_fire_remnant: { kind: "dash", allowCastRange: true },
  puck_illusory_orb: { kind: "dash", fields: ["max_distance"] },
  mirana_leap: { kind: "dash", fields: ["leap_distance"] },
  phantom_lancer_phantom_edge: { kind: "dash", fields: ["max_distance"] },
  slark_pounce: { kind: "dash", fields: ["pounce_distance"] },
  earth_spirit_rolling_boulder: { kind: "dash", fields: ["distance"] },
  pangolier_swashbuckle: { kind: "dash", fields: ["dash_range"] },
  primal_beast_onslaught: { kind: "dash", fields: ["max_distance"] },
  zuus_heavenly_jump: { kind: "dash", fields: ["hop_distance"] },
  void_spirit_astral_step: { kind: "dash", fields: ["max_travel_distance"] },
  monkey_king_tree_dance: { kind: "dash", fields: ["ground_jump_distance"] },
  magnataur_skewer: { kind: "dash", fields: ["range"] },
  ursa_earthshock: { kind: "dash", fields: ["hop_distance"] },
  pangolier_shield_crash: {
    kind: "dash",
    fields: ["jump_horizontal_distance"],
  },
  storm_spirit_ball_lightning: {
    kind: "dash",
    manaBased: true,
    note: "Ball Lightning dihitung dari mana penuh level 30.",
  },
};

const UNRESOLVED_MOVEMENT: Record<string, string> = {};

const CAST_RANGE_FIELDS = [
  "AbilityCastRange",
  "cast_range",
  "castrange",
  "arrow_range",
];

export interface MobilityCalculation {
  movementSpeed: number;
  dashDistance: number;
  blinkDistance: number;
  mobilityDistance: number;
  status: CalculationStatus;
  detail: Record<string, unknown>;
}

function manaDistance(
  ability: AbilityData,
  attributes: AttributesResult,
): number {
  const initialBase = findValue(ability, ["ball_lightning_initial_mana_base"]);
  const initialPct = findValue(ability, [
    "ball_lightning_initial_mana_percentage",
  ]);
  const travelBase = findValue(ability, ["ball_lightning_travel_cost_base"]);
  const travelPct = findValue(ability, [
    "ball_lightning_travel_cost_percent",
  ]);
  if (!initialBase || !initialPct || !travelBase || !travelPct) return 0;

  const maxMana = attributes.maxMana;
  const initial = maxValue(initialBase) + (maxValue(initialPct) / 100) * maxMana;
  const per100 = maxValue(travelBase) + (maxValue(travelPct) / 100) * maxMana;
  if (per100 <= 0) return 0;
  const remaining = Math.max(0, maxMana - initial);
  return (remaining / per100) * 100;
}

function distanceOf(
  ability: AbilityData,
  rule: MovementRule,
  attributes: AttributesResult,
): number {
  if (rule.manaBased) return manaDistance(ability, attributes);
  if (rule.fixed !== undefined) return rule.fixed;

  for (const field of rule.fields ?? []) {
    const value = findValue(ability, [field]);
    if (!value) continue;
    const distance = maxValue(value);
    if (distance > 0) return distance;
  }

  if (rule.allowCastRange) {
    for (const field of CAST_RANGE_FIELDS) {
      const value = findValue(ability, [field]);
      if (!value) continue;
      const distance = maxValue(value);
      if (distance > 0) return distance;
    }
  }

  return 0;
}

export function calculateMobility(
  hero: HeroData,
  attributes: AttributesResult,
  talents: AbilityData[],
): MobilityCalculation {
  let dashDistance = 0;
  let blinkDistance = 0;
  const unresolved: string[] = [];
  const details: Array<Record<string, unknown>> = [];

  for (const ability of hero.abilities) {
    if (ability.abilityType === "Talent") continue;

    const rule = MOVEMENT_RULES[ability.abilityKey];
    if (!rule) {
      const note = UNRESOLVED_MOVEMENT[ability.abilityKey];
      if (note) {
        unresolved.push(`${ability.displayName}: ${note}`);
        details.push({
          ability: ability.displayName,
          kind: "unresolved",
          distance: 0,
        });
      }
      continue;
    }

    const distance = distanceOf(ability, rule, attributes);
    if (distance <= 0) {
      unresolved.push(
        `${ability.displayName}: jarak perpindahan tidak tersedia.`,
      );
    }
    if (rule.assumption) {
      unresolved.push(`${ability.displayName}: ${rule.assumption}`);
    }

    if (rule.kind === "blink") {
      blinkDistance = Math.max(blinkDistance, distance);
    } else {
      dashDistance = Math.max(dashDistance, distance);
    }

    details.push({
      ability: ability.displayName,
      kind: rule.kind,
      distance,
      ...(rule.assumption
        ? { assumption: rule.assumption, counted: distance > 0 }
        : {}),
      ...(rule.note ? { note: rule.note } : {}),
    });
  }

  const mobilityDistance = Math.max(dashDistance, blinkDistance);

  return {
    movementSpeed: attributes.movementSpeed,
    dashDistance,
    blinkDistance,
    mobilityDistance,
    status: unresolved.length > 0 ? "PARTIAL" : "SUPPORTED",
    detail: {
      movementSpeed: attributes.movementSpeed,
      dashDistance,
      blinkDistance,
      mobilityDistance,
      baseMoveSpeed: hero.moveSpeed,
      bonusMovementSpeed: attributes.bonusMovementSpeed,
      selectedTalents: talents.map((talent) => talent.displayName),
      abilities: details,
      unresolved,
    },
  };
}
