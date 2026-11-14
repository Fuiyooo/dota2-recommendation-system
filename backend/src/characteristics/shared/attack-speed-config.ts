import type { AbilityData } from "../types";
import { TARGET } from "../config";
import { findValue, maxValue } from "./special-values";

interface AttackSpeedRule {
  field: string;
  note: string;
  durationField?: string;
}

/**
 * Ability yang memberi bonus attack speed ke diri sendiri dan tidak
 * kondisional. Ability kondisional, debuff musuh, dan buff ally tidak masuk.
 */
export const ABILITY_ATTACK_SPEED: Record<string, AttackSpeedRule> = {
  bloodseeker_bloodrage: {
    field: "attack_speed",
    note: "Bloodrage memberi attack speed selama aktif.",
  },
  nevermore_frenzy: {
    field: "bonus_attack_speed",
    note: "Frenzy memberi attack speed selama durasi.",
  },
  windrunner_focusfire: {
    field: "bonus_attack_speed",
    note: "Focus Fire memberi attack speed selama channel.",
  },
  beastmaster_inner_beast: {
    field: "bonus_attack_speed",
    note: "Inner Beast memberi attack speed pasif.",
  },
  phantom_assassin_phantom_strike: {
    field: "bonus_attack_speed",
    note: "Phantom Strike memberi attack speed setelah teleport.",
  },
  clinkz_strafe: {
    field: "attack_speed_bonus",
    note: "Strafe memberi attack speed selama aktif.",
  },
  ursa_overpower: {
    field: "attack_speed_bonus_pct",
    note: "Overpower memberi bonus attack speed.",
  },
  legion_commander_overwhelming_odds: {
    field: "bonus_attack_speed",
    durationField: "duration",
    note: "Overwhelming Odds memberi attack speed selama 6 detik.",
  },
  invoker_alacrity: {
    field: "bonus_attack_speed",
    note: "Alacrity memberi attack speed ke target.",
  },
  ogre_magi_bloodlust: {
    field: "bonus_attack_speed",
    note: "Bloodlust memberi attack speed ke target.",
  },
  wisp_overcharge: {
    field: "bonus_attack_speed",
    note: "Overcharge memberi attack speed selama aktif.",
  },
  troll_warlord_battle_trance: {
    field: "attack_speed",
    note: "Battle Trance memberi attack speed selama aktif.",
  },
  arc_warden_magnetic_field: {
    field: "attack_speed_bonus",
    note: "Magnetic Field memberi attack speed di area.",
  },
  snapfire_lil_shredder: {
    field: "attack_speed_bonus",
    note: "Lil' Shredder memberi attack speed selama aktif.",
  },
  juggernaut_omni_slash: {
    field: "bonus_attack_speed",
    note: "Omnislash memberi attack speed selama ultimate.",
  },
};

export function abilityAttackSpeedBonus(
  abilities: AbilityData[],
): number {
  let total = 0;
  for (const ability of abilities) {
    if (ability.abilityType === "Talent") continue;
    const rule = ABILITY_ATTACK_SPEED[ability.abilityKey];
    if (!rule) continue;
    const value = findValue(ability, [rule.field]);
    if (!value) continue;
    let uptime = 1;
    if (rule.durationField) {
      const duration = findValue(ability, [rule.durationField]);
      if (duration) {
        uptime = Math.min(TARGET.attackWindowSeconds, maxValue(duration)) / TARGET.attackWindowSeconds;
      }
    }
    total += maxValue(value) * uptime;
  }
  return total;
}
