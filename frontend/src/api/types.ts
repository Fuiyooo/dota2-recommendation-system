export interface HeroSummary {
  id: number;
  name: string;
  localizedName: string;
  primaryAttr: string;
  attackType: string;
  roles: string[];
  complexity: number | null;
  baseStr: number;
  baseAgi: number;
  baseInt: number;
  strGain: number;
  agiGain: number;
  intGain: number;
  attackRange: number | null;
  moveSpeed: number | null;
  armor: number | null;
  syncedAt: string;
}

export interface ValveBonus {
  name: string;
  value: number;
  operation: number;
}

export interface SpecialValue {
  name: string;
  heading: string;
  values: number[];
  isPercentage: boolean;
  bonuses: ValveBonus[];
  scepterValues: number[];
  shardValues: number[];
  facetBonus?: {
    name: string;
    values: number[];
    operation: number;
  } | null;
  requiredFacet?: string | null;
}

export interface TalentBonusRef {
  abilityKey: string | null;
  specialValue: string;
  value: number;
  operation: number;
}

export interface TalentSpecialValues {
  bonusRefs?: TalentBonusRef[];
  ownValues?: SpecialValue[];
}

export interface Ability {
  id: number;
  valveId: number | null;
  abilityKey: string;
  displayName: string;
  abilityType: string;
  isInnate: boolean;
  hasScepter: boolean;
  hasShard: boolean;
  maxLevel: number;
  damageType: string | null;
  talentTier: number | null;
  talentLevel: number | null;
  linkedAbilityKey: string | null;
  specialValues: SpecialValue[] | TalentSpecialValues | null;
  rawData?: {
    desc_loc?: string;
    lore_loc?: string;
    notes_loc?: string[];
  };
  validationStatus: string;
}

export interface HeroDetail extends HeroSummary {
  abilities: Ability[];
}

export interface Snapshot {
  id: number;
  patch: string;
  bracket: string;
  week: number;
  source: string;
  timeWindow: string;
  capturedAt: string;
  _count?: {
    stats: number;
  };
}

export interface MetaStat {
  id: number;
  heroId: number;
  position: number | null;
  scope: string;
  pickCount: number;
  winCount: number;
  pickRate: number | null;
  winRate: number | null;
  matchCount: number;
  bracket: string;
  timeWindow: string;
  source: string;
  hero: {
    localizedName: string;
    primaryAttr: string;
    attackType: string;
  };
}

export interface MetaResponse {
  snapshot: Snapshot | null;
  stats: MetaStat[];
}

export interface DataSource {
  id: number;
  sourceName: string;
  gameVersion: string;
  sourceRevision: string;
  fetchedAt: string;
  validationStatus: string;
  notes: string | null;
  rawPath: string | null;
}

export interface SyncRun {
  id: number;
  source: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  heroCount: number;
  abilityCount: number;
  note: string | null;
}

export interface PatchChange {
  id: number;
  patch: string;
  heroId: number | null;
  abilityId: number | null;
  kind: string;
  note: string;
  createdAt: string;
  hero: {
    localizedName: string;
  } | null;
  ability: {
    displayName: string;
    abilityKey: string;
  } | null;
}

export interface DataStatus {
  targetPatch: string;
  patch: {
    name: string;
    verified: boolean;
    fetchedAt: string | null;
    sourceRevision: string | null;
  };
  counts: {
    heroes: number;
    abilities: number;
    talents: number;
    metaStats: number;
  };
  snapshot: Snapshot | null;
  sources: DataSource[];
  syncRuns: SyncRun[];
  validation: {
    totalChanges: number;
    recent: PatchChange[];
  };
}

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

export interface CalculationRun {
  id: number;
  patch: string;
  configVersion: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  heroCount: number;
  note: string | null;
}

export interface IndicatorScore {
  indicator: string;
  characteristic: CharacteristicName;
  rawValue: number | null;
  percentile: number | null;
  score: number | null;
  populationSize: number;
  status: CalculationStatus;
}

export interface CharacteristicScore {
  id: number;
  heroId: number;
  characteristic: CharacteristicName;
  score: number | null;
  status: CalculationStatus;
  weights: Record<string, number>;
  indicators: IndicatorScore[];
}

export interface CharacteristicsResponse {
  run: CalculationRun | null;
  heroes: Array<{
    heroId: number;
    heroName: string;
    primaryAttr: string;
    attackType: string;
    scores: Record<
      CharacteristicName,
      { score: number | null; status: CalculationStatus }
    >;
  }>;
}

export interface HeroCharacteristicsResponse {
  run: CalculationRun | null;
  hero: {
    id: number;
    localizedName: string;
    primaryAttr: string;
    attackType: string;
    roles: string[];
  } | null;
  characteristics: CharacteristicScore[];
}

export interface HeroIndicator {
  id: number;
  heroId: number;
  characteristic: CharacteristicName;
  indicator: string;
  rawValue: number | null;
  unit: string;
  status: CalculationStatus;
  detail: Record<string, unknown>;
}

export interface BreakdownResponse {
  run: CalculationRun | null;
  indicators: HeroIndicator[];
}

export interface SawRun {
  id: number;
  runId: number;
  weights: Record<CharacteristicName, number>;
  createdAt: string;
}

export interface SawResult {
  heroId: number;
  heroName: string;
  complexity: number | null;
  attackType: string;
  mainPosition: number | null;
  pickRate: number;
  pickCount: number;
  rank: number;
  finalScore: number;
  normalizedScores: Partial<Record<CharacteristicName, number>>;
}

export interface SawResponse {
  sawRun: SawRun | null;
  results: SawResult[];
}

export interface CalculationStatusResponse {
  run: CalculationRun | null;
  counts: {
    indicators: number;
    scores: number;
    characteristics: number;
  } | null;
  configVersion?: string;
}

export type CcControlType =
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

export type CcDispelType =
  | "BASIC_DISPELLABLE"
  | "STRONG_DISPELLABLE"
  | "UNDISPELLABLE"
  | "UNKNOWN";

export type CcDebuffImmunity =
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

export interface CcEffect {
  id: string;
  abilityKey: string;
  abilityName: string;
  effectName: string;
  controlType: CcControlType;
  duration: number | null;
  instances: number;
  dispelType: CcDispelType;
  debuffImmunity: CcDebuffImmunity;
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

export interface CcOverlapGroup {
  controlType: CcControlType;
  unionDuration: number;
  contribution: number;
  effectIds: string[];
  conflict: boolean;
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
  effects: CcEffect[];
  overlapGroups: CcOverlapGroup[];
}

export interface CcLabResponse {
  configVersion: string;
  scenario: {
    useDebuffImmunityMultiplier: boolean;
    assumeConditionMet: boolean;
  };
  results: CcHeroResult[];
  summary: {
    classified: number;
    returned: number;
    totalHeroes: number;
    withEffects: number;
  };
}

export interface CcLabHeroResponse {
  configVersion: string;
  scenario?: {
    useDebuffImmunityMultiplier: boolean;
    assumeConditionMet: boolean;
  };
  result: CcHeroResult | null;
}

export interface CcLabConfig {
  version: string;
  controlStrength: Record<CcControlType, number>;
  defaultDispelMultiplier: Record<string, number>;
  defaultDebuffImmunityMultiplier: Record<string, number>;
  presets: Array<{
    id: "A" | "B" | "C" | "D";
    label: string;
    dispelMultiplier: Record<string, number>;
    debuffImmunityMultiplier: Record<string, number>;
    useDebuffImmunity: boolean;
  }>;
  defaults: {
    useDebuffImmunity: boolean;
    assumeConditionMet: boolean;
    includeUnclassified: boolean;
  };
  registryCount: number;
  classifiedHeroes: string[];
}

export interface CcSensitivityResponse {
  configVersion: string;
  scenario: {
    useDebuffImmunityMultiplier: boolean;
    assumeConditionMet: boolean;
  };
  baseline: string;
  summary: Array<{
    preset: string;
    label: string;
    top10Overlap: number;
    averageAbsoluteRankChange: number;
    heroCount: number;
  }>;
  runs: Array<{
    preset: string;
    label: string;
    useDebuffImmunity: boolean;
    rows: Array<{
      heroId: number;
      heroName: string;
      totalCc: number;
      percentile: number;
      score: number;
      rank: number;
    }>;
  }>;
  note: string;
}

export interface CcLabAbilityRegistry {
  registry: Array<{
    id: string;
    abilityKey: string;
    effectName: string;
    controlType: CcControlType;
    dispelType: CcDispelType;
    debuffImmunity: CcDebuffImmunity;
    isConditional: boolean;
    conditionDescription?: string;
    sourceNote: string;
    upgradeType?: "BASE" | "SCEPTER" | "SHARD";
    ability: {
      heroName: string;
      abilityKey: string;
      displayName: string;
    } | null;
  }>;
  classifiedHeroes: string[];
}

export interface CcAuditRow {
  id: string;
  heroName: string;
  abilityKey: string;
  displayName: string;
  upgradeType: "SCEPTER" | "SHARD";
  scopeStatus: "EXCLUDED_BY_SCOPE";
  granted: boolean;
  hasFlag: boolean;
  baseCc: boolean;
  textCc: boolean;
  upgradeText: string;
  changedFields: string[];
  changedCcFields: string[];
  category: "NEW_GRANTED" | "NEW_CC" | "MODIFY_CC" | "POSSIBLE" | "NOT_CC";
  registered: boolean;
  registeredEffects: string[];
}

export interface CcAuditResponse {
  configVersion: string;
  summary: {
    totalUpgrades: number;
    scepter: number;
    shard: number;
    newGranted: number;
    newCc: number;
    modifyCc: number;
    possible: number;
    notCc: number;
    registered: number;
    excludedByScope: number;
    unregisteredCcCandidates: number;
  };
  rows: CcAuditRow[];
}

export interface CcImportResult {
  imported: number;
  excluded: number;
  skipped: number;
  total: number;
  errors: Array<{ row: number; message: string }>;
}

export type DamageType = "PHYSICAL" | "MAGICAL" | "PURE";
export type DamageSecondary = DamageType | "NONE";

export interface DamageProfile {
  main: DamageType;
  secondary: DamageSecondary;
}

export interface AdminSession {
  username: string;
}

export interface AdminDamageProfileRow {
  heroId: number;
  heroName: string;
  attackType: string;
  complexity: number | null;
  main: DamageType | null;
  secondary: DamageSecondary | null;
  notes: string | null;
  updatedAt: string | null;
  values: {
    physical: number | null;
    magic: number | null;
    pure: number | null;
  };
}

export interface AdminDamageProfilesResponse {
  runId: number | null;
  profiles: AdminDamageProfileRow[];
}

export interface AdminBulkResult {
  updated: number;
}

export type AdminCcDispel = "STRONG" | "BASIC" | "UNDISPELLABLE" | "UNKNOWN";
export type AdminCcPierce = "YES" | "NO" | "UNKNOWN";

export interface AdminCcAbilityRow {
  abilityId: number;
  abilityKey: string;
  abilityName: string;
  heroName: string;
  controlType: "HARD" | "SOFT" | "-";
  duration: number | null;
  dispelType: AdminCcDispel;
  piercesImmunity: AdminCcPierce;
  updatedAt: string;
}

export interface AdminCcAbilitiesResponse {
  runId: number | null;
  abilities: AdminCcAbilityRow[];
}
