import type { AbilityData, HeroData } from "../types";

export interface TalentSelection {
  talents: AbilityData[];
  detail: string[];
}

/**
 * Pada level 30, tier talent 10, 15, 20, dan 25 terbuka dua kali.
 * Hero memakai kedua opsi di setiap tier, total 8 talent.
 * Karena itu tidak ada pemilihan satu talent per tier.
 */
export function selectTalents(hero: HeroData): TalentSelection {
  const talents = hero.abilities
    .filter(
      (ability) =>
        ability.abilityType === "Talent" && ability.talentLevel !== null,
    )
    .sort((left, right) => {
      const levelDiff = (left.talentLevel ?? 0) - (right.talentLevel ?? 0);
      if (levelDiff !== 0) return levelDiff;
      return left.displayName.localeCompare(right.displayName);
    });

  return {
    talents,
    detail: talents.map(
      (talent) => `${talent.talentLevel}: ${talent.displayName}`,
    ),
  };
}
