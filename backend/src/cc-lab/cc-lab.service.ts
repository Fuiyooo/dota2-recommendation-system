import { Injectable } from "@nestjs/common";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { Prisma } from "@prisma/client";
import type { AbilityData } from "../characteristics/types";
import { PrismaService } from "../prisma/prisma.service";
import { percentileRank } from "../scoring/percentile";
import { scoreFromPercentile } from "../characteristics/config";
import {
  CC_ACTIVE_REGISTRY,
  CC_CLASSIFIED_HEROES,
  CC_EFFECT_REGISTRY,
} from "./cc-registry";
import {
  CC_DEFAULT_MULTIPLIERS,
  CC_LAB_CONFIG_VERSION,
  CC_LAB_DEFAULTS,
  CC_PRESETS,
} from "./cc-config";
import { calculateHeroCc } from "./cc-calculator";
import type {
  CcDurationSpec,
  CcEffectDefinition,
  CcMultiplierConfig,
  CcPreset,
  CcScenario,
} from "./cc-types";

export interface CcLabOptions {
  useDebuffImmunity?: boolean;
  assumeConditionMet?: boolean;
  includeUnclassified?: boolean;
  preset?: CcPreset["id"];
}

interface HeroRow {
  id: number;
  localizedName: string;
  primaryAttr: string;
  complexity: number | null;
  abilities: Array<{
    id: number;
    abilityKey: string;
    displayName: string;
    abilityType: string;
    isInnate: boolean;
    maxLevel: number;
    damageType: string | null;
    talentLevel: number | null;
    linkedAbilityKey: string | null;
    specialValues: Prisma.JsonValue | null;
    rawData: Prisma.JsonValue;
    sortOrder: number;
  }>;
}

function mapHero(row: HeroRow): {
  id: number;
  localizedName: string;
  primaryAttr: string;
  complexity: number | null;
  abilities: AbilityData[];
} {
  return {
    id: row.id,
    localizedName: row.localizedName,
    primaryAttr: row.primaryAttr,
    complexity: row.complexity,
    abilities: row.abilities.map((ability) => ({
      ...ability,
      specialValues: ability.specialValues,
      rawData: ability.rawData,
    })) as AbilityData[],
  };
}

function presetConfig(preset: CcPreset): CcMultiplierConfig {
  return {
    controlStrength: CC_DEFAULT_MULTIPLIERS.controlStrength,
    dispelMultiplier: preset.dispelMultiplier,
    debuffImmunityMultiplier: preset.debuffImmunityMultiplier,
  };
}

@Injectable()
export class CcLabService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig() {
    const registry = await this.activeRegistry();
    return {
      version: CC_LAB_CONFIG_VERSION,
      controlStrength: CC_DEFAULT_MULTIPLIERS.controlStrength,
      defaultDispelMultiplier: CC_DEFAULT_MULTIPLIERS.dispelMultiplier,
      defaultDebuffImmunityMultiplier:
        CC_DEFAULT_MULTIPLIERS.debuffImmunityMultiplier,
      presets: CC_PRESETS,
      defaults: CC_LAB_DEFAULTS,
      registryCount: registry.length,
      classifiedHeroes: CC_CLASSIFIED_HEROES,
    };
  }

  async heroes(options: CcLabOptions = {}) {
    const rows = await this.prisma.hero.findMany({
      include: { abilities: { orderBy: { sortOrder: "asc" } } },
      orderBy: { localizedName: "asc" },
    });
    const scenario = this.scenario(options);
    const multipliers = this.multipliers(options);
    const registry = await this.activeRegistry();
    const results = rows.map((row) =>
      calculateHeroCc(
        mapHero(row),
        multipliers,
        scenario,
        registry,
        CC_CLASSIFIED_HEROES,
      ),
    );
    const filtered = options.includeUnclassified
      ? results
      : results.filter((result) => result.classified || result.effectCount > 0);

    return {
      configVersion: CC_LAB_CONFIG_VERSION,
      scenario,
      results: filtered,
      summary: {
        classified: filtered.filter((result) => result.classified).length,
        returned: filtered.length,
        totalHeroes: results.length,
        withEffects: filtered.filter((result) => result.effectCount > 0).length,
      },
    };
  }

  async hero(heroId: number, options: CcLabOptions = {}) {
    const row = await this.prisma.hero.findUnique({
      where: { id: heroId },
      include: { abilities: { orderBy: { sortOrder: "asc" } } },
    });
    if (!row) {
      return { configVersion: CC_LAB_CONFIG_VERSION, result: null };
    }
    const registry = await this.activeRegistry();
    return {
      configVersion: CC_LAB_CONFIG_VERSION,
      scenario: this.scenario(options),
      result: calculateHeroCc(
        mapHero(row),
        this.multipliers(options),
        this.scenario(options),
        registry,
        CC_CLASSIFIED_HEROES,
      ),
    };
  }

  async abilities() {
    const rows = await this.prisma.hero.findMany({
      include: { abilities: true },
    });
    const byKey = new Map<
      string,
      { heroName: string; abilityKey: string; displayName: string }
    >();
    for (const hero of rows) {
      for (const ability of hero.abilities) {
        byKey.set(ability.abilityKey, {
          heroName: hero.localizedName,
          abilityKey: ability.abilityKey,
          displayName: ability.displayName,
        });
      }
    }

    const registry = await this.registry(false);
    return {
      registry: registry.map((effect) => ({
        ...effect,
        ability: byKey.get(effect.abilityKey) ?? null,
      })),
      classifiedHeroes: CC_CLASSIFIED_HEROES,
    };
  }

  async calculate(options: CcLabOptions = {}) {
    return this.heroes(options);
  }

  async audit() {
    const allRegistry = await this.registry(false);
    const heroes = await this.prisma.hero.findMany({
      include: { abilities: { orderBy: { sortOrder: "asc" } } },
      orderBy: { localizedName: "asc" },
    });
    const ccWords = [
      "stun",
      "slow",
      "silence",
      "root",
      "hex",
      "fear",
      "taunt",
      "disarm",
      "blind",
      "leash",
      "entangle",
      "banish",
      "cyclone",
      "sleep",
      "hypnotize",
      "knock",
      "pull",
      "drag",
      "toss",
      "air",
    ];
    const ccFields = [
      ...ccWords,
      "duration",
      "radius",
      "aoe",
      "cast_range",
      "castrange",
      "range",
      "distance",
      "targets",
      "grab_radius",
    ];
    const rows: Array<Record<string, unknown>> = [];

    for (const hero of heroes) {
      for (const ability of hero.abilities) {
        if (ability.abilityType === "Talent") continue;
        const raw = (ability.rawData ?? {}) as Record<string, unknown>;
        const specialValues = Array.isArray(raw.special_values)
          ? (raw.special_values as Array<Record<string, unknown>>)
          : [];
        const baseText = `${String(raw.desc_loc ?? "")} ${ability.displayName}`.toLowerCase();
        const baseNames = specialValues
          .map((value) => String(value.name ?? "").toLowerCase())
          .join(" ");
        const baseCc =
          ccWords.some((word) => baseText.includes(word)) ||
          ccWords.some((word) => baseNames.includes(word));

        const upgrades = [
          {
            type: "SCEPTER" as const,
            loc: String(raw.scepter_loc ?? ""),
            granted: Boolean(raw.ability_is_granted_by_scepter),
            hasFlag: Boolean(raw.ability_has_scepter),
            valueKey: "values_scepter",
          },
          {
            type: "SHARD" as const,
            loc: String(raw.shard_loc ?? ""),
            granted: Boolean(raw.ability_is_granted_by_shard),
            hasFlag: Boolean(raw.ability_has_shard),
            valueKey: "values_shard",
          },
        ];

        for (const upgrade of upgrades) {
          const changed = specialValues
            .filter(
              (value) =>
                Array.isArray(value[upgrade.valueKey]) &&
                (value[upgrade.valueKey] as unknown[]).length > 0,
            )
            .map((value) => String(value.name ?? ""));
          const changedCc = changed.filter((name) =>
            ccFields.some((word) => name.toLowerCase().includes(word)),
          );
          const hasUpgrade =
            upgrade.granted || upgrade.hasFlag || upgrade.loc.length > 0 || changed.length > 0;
          if (!hasUpgrade) continue;

          const upgradeText = upgrade.loc.toLowerCase();
          const textCc = ccWords.some((word) => upgradeText.includes(word));
          let category = "NOT_CC";
          if (upgrade.granted && baseCc) category = "NEW_GRANTED";
          else if (textCc && !upgrade.granted) category = "NEW_CC";
          else if (baseCc && (changedCc.length > 0 || textCc)) category = "MODIFY_CC";
          else if (baseCc && (upgrade.loc.length > 0 || changed.length > 0)) {
            category = "POSSIBLE";
          }

          const registered = allRegistry.filter(
            (effect) =>
              effect.abilityKey === ability.abilityKey &&
              (effect.upgradeType ?? "BASE") === upgrade.type,
          ).map((effect) => effect.id);

          rows.push({
            id: `${ability.abilityKey}:${upgrade.type}`,
            heroName: hero.localizedName,
            abilityKey: ability.abilityKey,
            displayName: ability.displayName,
            upgradeType: upgrade.type,
            scopeStatus: "EXCLUDED_BY_SCOPE",
            granted: upgrade.granted,
            hasFlag: upgrade.hasFlag,
            baseCc,
            textCc,
            upgradeText: upgrade.loc,
            changedFields: changed,
            changedCcFields: changedCc,
            availableDurationFields: specialValues
              .map((value) => String(value.name ?? ""))
              .filter((name) =>
                /duration|stun|slow|silence|root|hex|fear|taunt|disarm|leash|entangle|air|toss|pull|drag|knock/i.test(
                  name,
                ),
              ),
            category,
            registered: registered.length > 0,
            registeredEffects: registered,
          });
        }
      }
    }

    const count = (predicate: (row: Record<string, unknown>) => boolean) =>
      rows.filter(predicate).length;

    return {
      configVersion: CC_LAB_CONFIG_VERSION,
      summary: {
        totalUpgrades: rows.length,
        scepter: count((row) => row.upgradeType === "SCEPTER"),
        shard: count((row) => row.upgradeType === "SHARD"),
        newGranted: count((row) => row.category === "NEW_GRANTED"),
        newCc: count((row) => row.category === "NEW_CC"),
        modifyCc: count((row) => row.category === "MODIFY_CC"),
        possible: count((row) => row.category === "POSSIBLE"),
        notCc: count((row) => row.category === "NOT_CC"),
        registered: count((row) => row.registered === true),
        excludedByScope: count(
          (row) => row.scopeStatus === "EXCLUDED_BY_SCOPE",
        ),
        unregisteredCcCandidates: count(
          (row) =>
            row.registered === false &&
            ["NEW_GRANTED", "NEW_CC", "MODIFY_CC", "POSSIBLE"].includes(
              String(row.category),
            ),
        ),
      },
      rows,
    };
  }

  async sensitivity(options: CcLabOptions = {}) {
    const rows = await this.prisma.hero.findMany({
      include: { abilities: { orderBy: { sortOrder: "asc" } } },
      orderBy: { localizedName: "asc" },
    });
    const heroes = rows.map(mapHero);
    const baseScenario = this.scenario(options);
    const baseOptions = { ...options, includeUnclassified: false };
    const registry = await this.activeRegistry();

    const runs = CC_PRESETS.map((preset) => {
      const multipliers = presetConfig(preset);
      const scenario = {
        ...baseScenario,
        useDebuffImmunityMultiplier: preset.useDebuffImmunity,
      };
      const results = heroes
        .map((hero) =>
          calculateHeroCc(
            hero,
            multipliers,
            scenario,
            registry,
            CC_CLASSIFIED_HEROES,
          ),
        )
        .filter((result) => result.classified && result.totalCc > 0)
        .sort((left, right) => right.totalCc - left.totalCc);
      const values = results.map((result) => result.totalCc);
      const scored = results.map((result, index) => {
        const percentile = percentileRank(result.totalCc, values);
        return {
          ...result,
          percentile,
          score: scoreFromPercentile(percentile),
          rank: index + 1,
        };
      });
      return {
        preset: preset.id,
        label: preset.label,
        useDebuffImmunity: preset.useDebuffImmunity,
        dispelMultiplier: preset.dispelMultiplier,
        debuffImmunityMultiplier: preset.debuffImmunityMultiplier,
        rows: scored.map((result) => ({
          heroId: result.heroId,
          heroName: result.heroName,
          totalCc: result.totalCc,
          percentile: result.percentile,
          score: result.score,
          rank: result.rank,
        })),
      };
    });

    const baseline = runs[0];
    const baselineRanks = new Map(
      baseline.rows.map((row) => [row.heroId, row.rank]),
    );
    const baselineTop10 = new Set(
      baseline.rows.slice(0, 10).map((row) => row.heroId),
    );

    const summary = runs.map((run) => {
      const top10 = run.rows.slice(0, 10).map((row) => row.heroId);
      const overlap =
        top10.length === 0
          ? 0
          : (top10.filter((heroId) => baselineTop10.has(heroId)).length /
              top10.length) *
            100;
      const changes = run.rows
        .map((row) => {
          const baseRank = baselineRanks.get(row.heroId);
          return baseRank === undefined ? null : Math.abs(row.rank - baseRank);
        })
        .filter((value): value is number => value !== null);
      const average =
        changes.length === 0
          ? 0
          : changes.reduce((sum, value) => sum + value, 0) / changes.length;

      return {
        preset: run.preset,
        label: run.label,
        top10Overlap: overlap,
        averageAbsoluteRankChange: average,
        heroCount: run.rows.length,
      };
    });

    return {
      configVersion: CC_LAB_CONFIG_VERSION,
      scenario: baseScenario,
      baseline: baseline.preset,
      summary,
      runs,
      note:
        "Sensitivity ini hanya untuk CC, bukan SAW penuh. Jumlah hero terklasifikasi masih terbatas.",
      options: baseOptions,
    };
  }

  async exportVerificationCsv(): Promise<string> {
    const audit = await this.audit();
    type AuditRow = {
      heroName: string;
      abilityKey: string;
      displayName: string;
      upgradeType: string;
      category: string;
      upgradeText: string;
      availableDurationFields: string[];
      scopeStatus: string;
    };
    const auditRows = audit.rows as AuditRow[];
    const registry = await this.registry(false);
    const heroRows = await this.prisma.hero.findMany({
      include: { abilities: true },
    });
    const abilityById = new Map<
      string,
      { heroName: string; abilityName: string }
    >();
    for (const hero of heroRows) {
      for (const ability of hero.abilities) {
        abilityById.set(ability.abilityKey, {
          heroName: hero.localizedName,
          abilityName: ability.displayName,
        });
      }
    }
    const dbRows = await this.prisma.ccEffect.findMany();
    const dbById = new Map(dbRows.map((row) => [`db-${row.id}`, row]));
    const rows: Array<Record<string, string>> = [];
    const usedIds = new Set<string>();

    const pushEffect = (
      effect: CcEffectDefinition,
      auditRow?: AuditRow,
    ) => {
      usedIds.add(effect.id);
      const db = dbById.get(effect.id);
      const ability = abilityById.get(effect.abilityKey);
      const upgradeType = effect.upgradeType ?? "BASE";
      rows.push({
        heroName: auditRow?.heroName ?? ability?.heroName ?? "",
        abilityKey: effect.abilityKey,
        abilityName:
          auditRow?.displayName ?? ability?.abilityName ?? "",
        upgradeType,
        scopeStatus:
          upgradeType === "BASE" ? "ACTIVE" : "EXCLUDED_BY_SCOPE",
        effectName: effect.effectName,
        controlType: effect.controlType,
        durationField: effect.duration.specialValue ?? "",
        durationFixed:
          effect.duration.fixed === undefined
            ? ""
            : String(effect.duration.fixed),
        instances: String(effect.duration.instances ?? 1),
        scepterMode: effect.duration.scepterMode ?? "",
        shardMode: effect.duration.shardMode ?? "",
        requiresScepter: booleanText(effect.requiresScepter ?? false),
        requiresShard: booleanText(effect.requiresShard ?? false),
        dispelType: effect.dispelType,
        debuffImmunity: effect.debuffImmunity,
        isConditional: booleanText(effect.isConditional),
        conditionDescription: effect.conditionDescription ?? "",
        conditionSupported: booleanText(effect.conditionSupported),
        startOffset: String(effect.startOffset),
        confidence: effect.confidence ?? "VERIFIED",
        verified: booleanText(db ? db.verified : true),
        sourceNote: effect.sourceNote,
        notes: db?.notes ?? "",
        auditCategory: auditRow?.category ?? "",
        auditEvidence: auditRow?.upgradeText ?? "",
        availableDurationFields:
          auditRow?.availableDurationFields.join("|") ?? "",
      });
    };

    for (const auditRow of auditRows) {
      const candidates = registry.filter(
        (effect) =>
          effect.abilityKey === auditRow.abilityKey &&
          (effect.upgradeType ?? "BASE") === auditRow.upgradeType,
      );
      if (candidates.length > 0) {
        for (const effect of candidates) pushEffect(effect, auditRow);
      } else {
        rows.push({
          heroName: auditRow.heroName,
          abilityKey: auditRow.abilityKey,
          abilityName: auditRow.displayName,
          upgradeType: auditRow.upgradeType,
          scopeStatus: auditRow.scopeStatus,
          effectName: "",
          controlType: "",
          durationField: "",
          durationFixed: "",
          instances: "1",
          scepterMode: "",
          shardMode: "",
          requiresScepter: auditRow.upgradeType === "SCEPTER" ? "TRUE" : "FALSE",
          requiresShard: auditRow.upgradeType === "SHARD" ? "TRUE" : "FALSE",
          dispelType: "",
          debuffImmunity: "",
          isConditional: "FALSE",
          conditionDescription: "",
          conditionSupported: "TRUE",
          startOffset: "0",
          confidence: "VERIFIED",
          verified: "FALSE",
          sourceNote: "",
          notes: "",
          auditCategory: auditRow.category,
          auditEvidence: auditRow.upgradeText,
          availableDurationFields:
            auditRow.availableDurationFields.join("|"),
        });
      }
    }

    for (const effect of registry) {
      if (usedIds.has(effect.id)) continue;
      pushEffect(effect);
    }

    return stringify(rows, {
      header: true,
      columns: [
        "heroName",
        "abilityKey",
        "abilityName",
        "upgradeType",
        "scopeStatus",
        "effectName",
        "controlType",
        "durationField",
        "durationFixed",
        "instances",
        "scepterMode",
        "shardMode",
        "requiresScepter",
        "requiresShard",
        "dispelType",
        "debuffImmunity",
        "isConditional",
        "conditionDescription",
        "conditionSupported",
        "startOffset",
        "confidence",
        "verified",
        "sourceNote",
        "notes",
        "auditCategory",
        "auditEvidence",
        "availableDurationFields",
      ],
    });
  }

  async importVerificationCsv(csv: string) {
    const controlTypes = new Set([
      "STUN",
      "HEX",
      "BANISH",
      "FEAR",
      "TAUNT",
      "SILENCE",
      "ROOT",
      "DISARM",
      "SLOW",
      "ATTACK_SLOW",
    ]);
    const dispelTypes = new Set([
      "BASIC_DISPELLABLE",
      "STRONG_DISPELLABLE",
      "UNDISPELLABLE",
      "UNKNOWN",
    ]);
    const immunityTypes = new Set([
      "PIERCES",
      "DOES_NOT_PIERCE",
      "PARTIAL",
      "UNKNOWN",
    ]);
    const upgradeTypes = new Set(["BASE", "SCEPTER", "SHARD"]);
    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    }) as Array<Record<string, string>>;

    let imported = 0;
    let excludedCount = 0;
    let skipped = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let index = 0; index < records.length; index += 1) {
      const row = records[index];
      const rowNumber = index + 2;
      const abilityKey = row.abilityKey?.trim();
      const effectName = row.effectName?.trim();
      const controlType = row.controlType?.trim();

      if (!abilityKey || !effectName || !controlType) {
        skipped += 1;
        continue;
      }

      if (!controlTypes.has(controlType)) {
        errors.push({ row: rowNumber, message: `controlType tidak valid: ${controlType}` });
        continue;
      }
      const dispelType = row.dispelType?.trim() || "UNKNOWN";
      if (!dispelTypes.has(dispelType)) {
        errors.push({ row: rowNumber, message: `dispelType tidak valid: ${dispelType}` });
        continue;
      }
      const debuffImmunity = row.debuffImmunity?.trim() || "UNKNOWN";
      if (!immunityTypes.has(debuffImmunity)) {
        errors.push({
          row: rowNumber,
          message: `debuffImmunity tidak valid: ${debuffImmunity}`,
        });
        continue;
      }
      const upgradeType = (row.upgradeType?.trim() || "BASE").toUpperCase();
      if (!upgradeTypes.has(upgradeType)) {
        errors.push({ row: rowNumber, message: `upgradeType tidak valid: ${upgradeType}` });
        continue;
      }
      const durationField = row.durationField?.trim() || null;
      const durationFixedRaw = row.durationFixed?.trim();
      const durationFixed = durationFixedRaw
        ? Number.parseFloat(durationFixedRaw)
        : null;
      if (!durationField && (durationFixed === null || !Number.isFinite(durationFixed))) {
        errors.push({
          row: rowNumber,
          message: "Isi durationField atau durationFixed.",
        });
        continue;
      }
      if (durationField && durationFixed !== null) {
        errors.push({
          row: rowNumber,
          message: "Isi hanya salah satu: durationField atau durationFixed.",
        });
        continue;
      }
      const scepterMode = row.scepterMode?.trim().toLowerCase() || null;
      const shardMode = row.shardMode?.trim().toLowerCase() || null;
      if (scepterMode && !["add", "replace"].includes(scepterMode)) {
        errors.push({ row: rowNumber, message: `scepterMode tidak valid: ${scepterMode}` });
        continue;
      }
      if (shardMode && !["add", "replace"].includes(shardMode)) {
        errors.push({ row: rowNumber, message: `shardMode tidak valid: ${shardMode}` });
        continue;
      }
      const confidence = (row.confidence?.trim() || "VERIFIED").toUpperCase();
      if (!["VERIFIED", "AUTO"].includes(confidence)) {
        errors.push({ row: rowNumber, message: `confidence tidak valid: ${confidence}` });
        continue;
      }
      const instancesRaw = row.instances?.trim();
      const instances = instancesRaw ? Number.parseInt(instancesRaw, 10) : 1;
      if (!Number.isFinite(instances) || instances < 1) {
        errors.push({ row: rowNumber, message: `instances tidak valid: ${instancesRaw}` });
        continue;
      }
      const excluded = upgradeType !== "BASE";
      const data = {
        abilityKey,
        effectName,
        controlType,
        durationField,
        durationFixed,
        instances,
        scepterMode,
        shardMode,
        requiresScepter: parseBool(row.requiresScepter),
        requiresShard: parseBool(row.requiresShard),
        dispelType,
        debuffImmunity,
        isConditional: parseBool(row.isConditional),
        conditionDescription: row.conditionDescription?.trim() || null,
        conditionSupported: parseBool(row.conditionSupported, true),
        startOffset: Number.parseFloat(row.startOffset || "0") || 0,
        upgradeType,
        confidence,
        sourceNote: row.sourceNote?.trim() || null,
        notes: row.notes?.trim() || null,
        verified: excluded ? false : parseBool(row.verified),
      };

      await this.prisma.ccEffect.upsert({
        where: {
          abilityKey_effectName_upgradeType: { abilityKey, effectName, upgradeType },
        },
        create: data,
        update: data,
      });
      if (excluded) excludedCount += 1;
      imported += 1;
    }

    return {
      imported,
      excluded: excludedCount,
      skipped,
      errors,
      total: records.length,
    };
  }

  private async activeRegistry(): Promise<CcEffectDefinition[]> {
    return this.registry(true);
  }

  private async registry(activeOnly: boolean): Promise<CcEffectDefinition[]> {
    const rows = await this.prisma.ccEffect.findMany({
      where: activeOnly ? { verified: true, upgradeType: "BASE" } : undefined,
    });
    const manualKeys = new Set(rows.map((row) => row.abilityKey));
    const codeEffects = (activeOnly ? CC_ACTIVE_REGISTRY : CC_EFFECT_REGISTRY).filter(
      (effect) => !manualKeys.has(effect.abilityKey),
    );
    return [...codeEffects, ...rows.map((row) => this.dbEffect(row))];
  }

  private dbEffect(row: {
    id: number;
    abilityKey: string;
    effectName: string;
    controlType: string;
    durationField: string | null;
    durationFixed: number | null;
    instances: number;
    scepterMode: string | null;
    shardMode: string | null;
    requiresScepter: boolean;
    requiresShard: boolean;
    dispelType: string;
    debuffImmunity: string;
    isConditional: boolean;
    conditionDescription: string | null;
    conditionSupported: boolean;
    startOffset: number;
    upgradeType: string;
    confidence: string;
    sourceNote: string | null;
  }): CcEffectDefinition {
    const duration: CcDurationSpec = {
      specialValue: row.durationField ?? undefined,
      fixed: row.durationFixed ?? undefined,
      instances: row.instances > 1 ? row.instances : undefined,
      scepterMode:
        row.scepterMode === "add" || row.scepterMode === "replace"
          ? row.scepterMode
          : undefined,
      shardMode:
        row.shardMode === "add" || row.shardMode === "replace"
          ? row.shardMode
          : undefined,
      requireScepter: row.requiresScepter,
      requireShard: row.requiresShard,
    };
    return {
      id: `db-${row.id}`,
      abilityKey: row.abilityKey,
      effectName: row.effectName,
      controlType: row.controlType as CcEffectDefinition["controlType"],
      duration,
      dispelType: row.dispelType as CcEffectDefinition["dispelType"],
      debuffImmunity:
        row.debuffImmunity as CcEffectDefinition["debuffImmunity"],
      isConditional: row.isConditional,
      conditionDescription: row.conditionDescription ?? undefined,
      conditionSupported: row.conditionSupported,
      startOffset: row.startOffset,
      sourceNote: row.sourceNote ?? "Input manual via CSV.",
      upgradeType: row.upgradeType as "BASE" | "SCEPTER" | "SHARD",
      requiresScepter: row.requiresScepter,
      requiresShard: row.requiresShard,
      confidence: row.confidence as "VERIFIED" | "AUTO",
    };
  }

  private scenario(options: CcLabOptions): CcScenario {
    const preset = options.preset
      ? CC_PRESETS.find((item) => item.id === options.preset)
      : undefined;
    return {
      useDebuffImmunityMultiplier:
        preset?.useDebuffImmunity ??
        options.useDebuffImmunity ??
        CC_LAB_DEFAULTS.useDebuffImmunity,
      assumeConditionMet:
        options.assumeConditionMet ?? CC_LAB_DEFAULTS.assumeConditionMet,
    };
  }

  private multipliers(options: CcLabOptions): CcMultiplierConfig {
    if (options.preset) {
      const preset = CC_PRESETS.find((item) => item.id === options.preset);
      if (preset) return presetConfig(preset);
    }
    return CC_DEFAULT_MULTIPLIERS;
  }
}

function booleanText(value: boolean): string {
  return value ? "TRUE" : "FALSE";
}

function parseBool(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === null || value === "") return fallback;
  return ["true", "1", "yes", "y"].includes(String(value).trim().toLowerCase());
}
