export interface ValveHeroSummary {
  id: number;
  name: string;
  name_loc: string;
  name_english_loc: string;
  primary_attr: number;
  complexity: number;
}

export interface ValveHeroListResponse {
  result: {
    data: {
      heroes: ValveHeroSummary[];
    };
  };
}

export interface ValveBonus {
  name: string;
  value: number;
  operation: number;
}

export interface ValveSpecialValue {
  name: string;
  values_float: number[];
  is_percentage?: boolean;
  heading_loc?: string;
  bonuses?: ValveBonus[];
  values_scepter?: number[];
  values_shard?: number[];
  facet_bonus?: {
    name: string;
    values: number[];
    operation: number;
  };
  required_facet?: string;
}

export interface ValveAbility {
  id: number;
  name: string;
  name_loc: string;
  desc_loc: string;
  type: number;
  behavior: number | string;
  damage: number;
  max_level: number;
  ability_is_innate?: boolean;
  ability_has_scepter?: boolean;
  ability_has_shard?: boolean;
  cooldowns?: number[];
  durations?: number[];
  special_values?: ValveSpecialValue[];
}

export interface ValveTalent {
  id: number;
  name: string;
  name_loc: string;
  type: number;
  special_values?: ValveSpecialValue[];
}

export interface ValveHero {
  id: number;
  name: string;
  name_loc: string;
  primary_attr: number;
  complexity: number;
  attack_capability: number;
  str_base: number;
  str_gain: number;
  agi_base: number;
  agi_gain: number;
  int_base: number;
  int_gain: number;
  attack_range: number;
  movement_speed: number;
  armor: number;
  damage_min?: number;
  damage_max?: number;
  attack_rate?: number;
  max_health?: number;
  health_regen?: number;
  max_mana?: number;
  magic_resistance?: number;
  abilities: ValveAbility[];
  talents: ValveTalent[];
  facets?: unknown[];
  facet_abilities?: unknown[];
}

export interface ValveHeroDataResponse {
  result: {
    data: {
      heroes: ValveHero[];
    };
  };
}

export interface ValvePatchListResponse {
  patches: Array<{
    patch_number: string;
    patch_name: string;
    patch_timestamp: number;
  }>;
  success: boolean;
}

export interface ValvePatchNote {
  indent_level: number;
  note: string;
  icon?: string;
}

export interface ValvePatchHero {
  hero_id: number;
  hero_notes?: ValvePatchNote[];
  abilities?: Array<{
    ability_id: number;
    ability_notes: ValvePatchNote[];
  }>;
}

export interface ValvePatchNotesResponse {
  patch_number: string;
  patch_name: string;
  patch_timestamp: number;
  heroes: ValvePatchHero[];
  items?: unknown[];
  neutral_items?: unknown[];
  success: boolean;
}
