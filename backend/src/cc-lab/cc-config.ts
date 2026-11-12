import type {
  CCControlType,
  CcMultiplierConfig,
  CcPreset,
} from "./cc-types";

export const CC_LAB_CONFIG_VERSION = "cc-lab-v2";

export const CC_CONTROL_STRENGTH: Record<CCControlType, number> = {
  STUN: 1,
  HEX: 1,
  BANISH: 0.9,
  FEAR: 0.85,
  TAUNT: 0.85,
  SILENCE: 0.65,
  ROOT: 0.55,
  DISARM: 0.5,
  SLOW: 0.3,
  ATTACK_SLOW: 0.2,
};

export const CC_DEFAULT_MULTIPLIERS: CcMultiplierConfig = {
  controlStrength: CC_CONTROL_STRENGTH,
  dispelMultiplier: {
    BASIC_DISPELLABLE: 0.6,
    STRONG_DISPELLABLE: 0.8,
    UNDISPELLABLE: 1,
  },
  debuffImmunityMultiplier: {
    PIERCES: 1,
    DOES_NOT_PIERCE: 0.7,
  },
};

export const CC_PRESETS: CcPreset[] = [
  {
    id: "A",
    label: "A: konservatif",
    dispelMultiplier: {
      BASIC_DISPELLABLE: 0.6,
      STRONG_DISPELLABLE: 0.8,
      UNDISPELLABLE: 1,
    },
    debuffImmunityMultiplier: { PIERCES: 1, DOES_NOT_PIERCE: 0.7 },
    useDebuffImmunity: true,
  },
  {
    id: "B",
    label: "B: sedang",
    dispelMultiplier: {
      BASIC_DISPELLABLE: 0.7,
      STRONG_DISPELLABLE: 0.85,
      UNDISPELLABLE: 1,
    },
    debuffImmunityMultiplier: { PIERCES: 1, DOES_NOT_PIERCE: 0.8 },
    useDebuffImmunity: true,
  },
  {
    id: "C",
    label: "C: longgar",
    dispelMultiplier: {
      BASIC_DISPELLABLE: 0.8,
      STRONG_DISPELLABLE: 0.9,
      UNDISPELLABLE: 1,
    },
    debuffImmunityMultiplier: { PIERCES: 1, DOES_NOT_PIERCE: 0.9 },
    useDebuffImmunity: true,
  },
  {
    id: "D",
    label: "D: tanpa multiplier",
    dispelMultiplier: {
      BASIC_DISPELLABLE: 1,
      STRONG_DISPELLABLE: 1,
      UNDISPELLABLE: 1,
    },
    debuffImmunityMultiplier: { PIERCES: 1, DOES_NOT_PIERCE: 1 },
    useDebuffImmunity: true,
  },
];

export const CC_LAB_DEFAULTS = {
  useDebuffImmunity: false,
  assumeConditionMet: true,
  includeUnclassified: false,
};

export const CC_DISPEL_VALUES = [
  "BASIC_DISPELLABLE",
  "STRONG_DISPELLABLE",
  "UNDISPELLABLE",
  "UNKNOWN",
] as const;

export const CC_IMMUNITY_VALUES = [
  "PIERCES",
  "DOES_NOT_PIERCE",
  "PARTIAL",
  "UNKNOWN",
] as const;
