export interface OpenDotaHero {
  id: number;
  name: string;
  localized_name: string;
  primary_attr: string;
  attack_type: string;
  roles: string[];
  base_str: number;
  base_agi: number;
  base_int: number;
  str_gain: number;
  agi_gain: number;
  int_gain: number;
  attack_point?: number;
  attack_rate?: number;
  base_health_regen?: number;
}

export type OpenDotaHeroes = Record<string, OpenDotaHero>;

export interface OpenDotaAttrib {
  key: string;
  header?: string;
  value: string | string[];
}

export interface OpenDotaAbility {
  dname: string;
  dmg_type?: string;
  attrib?: OpenDotaAttrib[];
}

export type OpenDotaAbilities = Record<string, OpenDotaAbility>;
