export type CCControlType =
  | "STUN"
  | "HEX"
  | "BANISH"
  | "FEAR"
  | "TAUNT"
  | "SILENCE"
  | "ROOT"
  | "DISARM"
  | "SLOW"
  | "ATTACK_SLOW";

export type DispelType =
  | "BASIC_DISPELLABLE"
  | "STRONG_DISPELLABLE"
  | "UNDISPELLABLE"
  | "UNKNOWN";

export type DebuffImmunityInteraction =
  | "PIERCES"
  | "DOES_NOT_PIERCE"
  | "PARTIAL"
  | "UNKNOWN";

export type CcCoverageStatus =
  | "SUPPORTED"
  | "PARTIAL"
  | "UNSUPPORTED"
  | "NOT_APPLICABLE"
  | "ERROR";

export interface CcDurationSpec {
  specialValue?: string;
  fixed?: number;
  instances?: number;
  scepterMode?: "add" | "replace";
  requireScepter?: boolean;
  scepterFlag?: string;
  shardMode?: "add" | "replace";
  requireShard?: boolean;
  shardFlag?: string;
}

export interface CcEffectDefinition {
  id: string;
  abilityKey: string;
  effectName: string;
  controlType: CCControlType;
  duration: CcDurationSpec;
  dispelType: DispelType;
  debuffImmunity: DebuffImmunityInteraction;
  isConditional: boolean;
  conditionDescription?: string;
  conditionSupported: boolean;
  startOffset: number;
  sourceNote: string;
  upgradeType?: "BASE" | "SCEPTER" | "SHARD";
  requiresScepter?: boolean;
  requiresShard?: boolean;
  confidence?: "VERIFIED" | "AUTO";
}

export interface CcEffectResult {
  id: string;
  abilityKey: string;
  abilityName: string;
  effectName: string;
  controlType: CCControlType;
  duration: number | null;
  instances: number;
  dispelType: DispelType;
  debuffImmunity: DebuffImmunityInteraction;
  isConditional: boolean;
  conditionDescription: string | null;
  start: number;
  end: number;
  rawContribution: number | null;
  status: CcCoverageStatus;
  upgradeType: "BASE" | "SCEPTER" | "SHARD";
  confidence: "VERIFIED" | "AUTO";
  reasons: string[];
  sourceNote: string;
}

export interface CcHeroResult {
  heroId: number;
  heroName: string;
  primaryAttr: string;
  complexity: number | null;
  classified: boolean;
  totalCc: number;
  effectCount: number;
  unsupportedCount: number;
  status: CcCoverageStatus;
  effects: CcEffectResult[];
  overlapGroups: Array<{
    controlType: CCControlType;
    unionDuration: number;
    contribution: number;
    effectIds: string[];
    conflict: boolean;
  }>;
}

export interface CcScenario {
  useDebuffImmunityMultiplier: boolean;
  assumeConditionMet: boolean;
}

export interface CcMultiplierConfig {
  controlStrength: Record<CCControlType, number>;
  dispelMultiplier: Record<Exclude<DispelType, "UNKNOWN">, number>;
  debuffImmunityMultiplier: Record<
    Exclude<DebuffImmunityInteraction, "UNKNOWN" | "PARTIAL">,
    number
  >;
}

export interface CcPreset {
  id: "A" | "B" | "C" | "D";
  label: string;
  dispelMultiplier: Record<Exclude<DispelType, "UNKNOWN">, number>;
  debuffImmunityMultiplier: Record<
    Exclude<DebuffImmunityInteraction, "UNKNOWN" | "PARTIAL">,
    number
  >;
  useDebuffImmunity: boolean;
}
