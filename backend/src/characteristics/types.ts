export type CharacteristicName =
  | "damage"
  | "durability"
  | "crowdControl"
  | "mobility";

export type CalculationStatus =
  | "SUPPORTED"
  | "PARTIAL"
  | "UNSUPPORTED"
  | "NOT_APPLICABLE"
  | "ERROR";

export interface AbilityData {
  id: number;
  abilityKey: string;
  displayName: string;
  abilityType: string;
  isInnate: boolean;
  maxLevel: number;
  damageType: string | null;
  talentLevel: number | null;
  linkedAbilityKey: string | null;
  specialValues: unknown;
  rawData: unknown;
  sortOrder: number;
}

export interface HeroData {
  id: number;
  localizedName: string;
  primaryAttr: string;
  attackType: string;
  baseStr: number;
  baseAgi: number;
  baseInt: number;
  strGain: number;
  agiGain: number;
  intGain: number;
  attackRange: number | null;
  moveSpeed: number | null;
  armor: number | null;
  damageMin: number | null;
  damageMax: number | null;
  attackRate: number | null;
  attackPoint: number | null;
  baseHealth: number | null;
  healthRegen?: number | null;
  baseMana: number | null;
  baseMagicResistance: number | null;
  abilities: AbilityData[];
}

export interface IndicatorValue {
  heroId: number;
  characteristic: CharacteristicName;
  indicator: string;
  rawValue: number | null;
  unit: string;
  status: CalculationStatus;
  detail: Record<string, unknown>;
}

export interface CharacteristicCalculation {
  heroId: number;
  indicators: IndicatorValue[];
}

export interface IndicatorScoreValue {
  heroId: number;
  characteristic: CharacteristicName;
  indicator: string;
  rawValue: number | null;
  percentile: number | null;
  score: number | null;
  populationSize: number;
  status: CalculationStatus;
}

export interface CharacteristicScoreValue {
  heroId: number;
  characteristic: CharacteristicName;
  score: number | null;
  status: CalculationStatus;
  indicators: IndicatorScoreValue[];
}
