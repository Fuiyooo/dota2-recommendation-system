import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ScoringService } from "../scoring/scoring.service";
import { DamageProfileService } from "../damage-profile/damage-profile.service";
import { DEFAULT_DAMAGE_PROFILE } from "../damage-profile/damage-profile.types";
import { CONFIG_VERSION, INDICATORS, TARGET } from "./config";
import { calculateDamage } from "./damage/damage-calculator";
import { calculateDurability } from "./durability/durability-calculator";
import { calculateCrowdControl } from "./crowd-control/cc-calculator";
import { calculateMobility } from "./mobility/mobility-calculator";
import { calculateAttributes } from "./shared/attribute-calculator";
import { selectTalents } from "./shared/talent-resolver";
import { isAghanimGranted } from "./shared/ability-scope";
import type {
  CcAbilityConfigMap,
  CcDispelType,
} from "./crowd-control/cc-main-config";
import type {
  AbilityData,
  HeroData,
  IndicatorValue,
} from "./types";

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function createManyChunked<T>(
  create: (chunk: T[]) => Promise<unknown>,
  data: T[],
  size = 50,
): Promise<void> {
  for (let index = 0; index < data.length; index += size) {
    await create(data.slice(index, index + size));
  }
}

function healthRegenOf(rawConstants: Prisma.JsonValue | null): number | null {
  if (
    !rawConstants ||
    typeof rawConstants !== "object" ||
    Array.isArray(rawConstants)
  ) {
    return null;
  }
  const valve = (rawConstants as Record<string, unknown>).valve;
  if (!valve || typeof valve !== "object" || Array.isArray(valve)) {
    return null;
  }
  const value = (valve as Record<string, unknown>).health_regen;
  return typeof value === "number" ? value : null;
}

function mapHero(hero: {
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
  baseMana: number | null;
  baseMagicResistance: number | null;
  rawConstants: Prisma.JsonValue;
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
}): HeroData {
  const { rawConstants, ...heroData } = hero;
  return {
    ...heroData,
    healthRegen: healthRegenOf(rawConstants),
    abilities: hero.abilities
      .filter((ability) => !isAghanimGranted(ability))
      .map((ability) => ({
        ...ability,
        specialValues: ability.specialValues,
        rawData: ability.rawData,
      })) as AbilityData[],
  };
}

export interface CalculationSummary {
  runId: number;
  heroes: number;
  indicators: number;
  statusCounts: Record<string, number>;
  scores: { indicators: number; characteristics: number };
}

@Injectable()
export class CharacteristicsService {
  private readonly logger = new Logger(CharacteristicsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
    private readonly config: ConfigService,
    private readonly damageProfiles: DamageProfileService,
  ) {}

  async calculate(): Promise<CalculationSummary> {
    const patch = this.config.get<string>("PATCH_TARGET") ?? "7.41f";
    const run = await this.prisma.calculationRun.create({
      data: {
        patch,
        configVersion: CONFIG_VERSION,
        status: "RUNNING",
      },
    });

    try {
      const rows = await this.prisma.hero.findMany({
        include: {
          abilities: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      const indicators: IndicatorValue[] = [];
      const profiles = await this.damageProfiles.loadMap();
      const ccConfig = await this.loadCcConfig();

      for (const row of rows) {
        const hero = mapHero(row);
        const talents = selectTalents(hero).talents;

        const damageAttributes = calculateAttributes(hero, talents);
        const profile = profiles.get(hero.id);
        const damage = calculateDamage(
          hero,
          damageAttributes,
          talents,
          profile ?? DEFAULT_DAMAGE_PROFILE,
          !profile,
        );

        const durabilityAttributes = calculateAttributes(hero, talents);
        const durability = calculateDurability(
          hero,
          durabilityAttributes,
          talents,
        );

        const crowdControl = calculateCrowdControl(hero, talents, ccConfig);

        const mobilityAttributes = calculateAttributes(hero, talents);
        const mobility = calculateMobility(
          hero,
          mobilityAttributes,
          talents,
        );

        indicators.push(
          {
            heroId: hero.id,
            characteristic: "damage",
            indicator: "physicalDamage",
            rawValue: damage.physical,
            unit: "damage",
            status: damage.status,
            detail: { ...damage.detail, component: "physical" },
          },
          {
            heroId: hero.id,
            characteristic: "damage",
            indicator: "magicDamage",
            rawValue: damage.magic,
            unit: "damage",
            status: damage.status,
            detail: { ...damage.detail, component: "magic" },
          },
          {
            heroId: hero.id,
            characteristic: "damage",
            indicator: "pureDamage",
            rawValue: damage.pure,
            unit: "damage",
            status: damage.status,
            detail: { ...damage.detail, component: "pure" },
          },
          {
            heroId: hero.id,
            characteristic: "durability",
            indicator: "maxHp",
            rawValue: durability.maxHp,
            unit: "HP",
            status: durability.status,
            detail: durability.detail,
          },
          {
            heroId: hero.id,
            characteristic: "durability",
            indicator: "armor",
            rawValue: durability.armor,
            unit: "armor",
            status: durability.status,
            detail: durability.detail,
          },
          {
            heroId: hero.id,
            characteristic: "durability",
            indicator: "magicResistance",
            rawValue: durability.magicResistance,
            unit: "%",
            status: durability.status,
            detail: durability.detail,
          },
          {
            heroId: hero.id,
            characteristic: "crowdControl",
            indicator: "disableDuration",
            rawValue: crowdControl.disableDuration,
            unit: "seconds",
            status: crowdControl.status,
            detail: crowdControl.detail,
          },
          {
            heroId: hero.id,
            characteristic: "crowdControl",
            indicator: "aoe",
            rawValue: crowdControl.aoe,
            unit: "radius",
            status: crowdControl.status,
            detail: crowdControl.detail,
          },
          {
            heroId: hero.id,
            characteristic: "crowdControl",
            indicator: "castRange",
            rawValue: crowdControl.castRange,
            unit: "range",
            status: crowdControl.status,
            detail: crowdControl.detail,
          },
          {
            heroId: hero.id,
            characteristic: "mobility",
            indicator: "movementSpeed",
            rawValue: mobility.movementSpeed,
            unit: "speed",
            status: mobility.status,
            detail: mobility.detail,
          },
          {
            heroId: hero.id,
            characteristic: "mobility",
            indicator: "mobilityDistance",
            rawValue: mobility.mobilityDistance,
            unit: "distance",
            status: mobility.status,
            detail: mobility.detail,
          },
        );
      }

      await createManyChunked(
        (chunk) =>
          this.prisma.heroIndicator.createMany({
            data: chunk.map((indicator) => ({
              runId: run.id,
              heroId: indicator.heroId,
              characteristic: indicator.characteristic,
              indicator: indicator.indicator,
              rawValue: indicator.rawValue,
              unit: indicator.unit,
              status: indicator.status,
              detail: toJson(indicator.detail),
            })),
          }),
        indicators,
      );

      await this.prisma.calculationRun.update({
        where: { id: run.id },
        data: { heroCount: rows.length },
      });

      const scores = await this.scoring.scoreRun(run.id);

      const statusCounts = indicators.reduce<Record<string, number>>(
        (counts, indicator) => {
          counts[indicator.status] = (counts[indicator.status] ?? 0) + 1;
          return counts;
        },
        {},
      );

      await this.prisma.calculationRun.update({
        where: { id: run.id },
        data: {
          status: "SUCCESS",
          finishedAt: new Date(),
          note: `${rows.length} hero, ${indicators.length} indikator. Coverage: ${JSON.stringify(statusCounts)}.`,
        },
      });

      this.logger.log(
        `Calculation ${run.id} selesai: ${rows.length} hero, ${indicators.length} indikator.`,
      );

      return {
        runId: run.id,
        heroes: rows.length,
        indicators: indicators.length,
        statusCounts,
        scores,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.calculationRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          note: message.slice(0, 500),
        },
      });
      this.logger.error(`Calculation ${run.id} gagal: ${message}`);
      throw error;
    }
  }

  getLatestRun() {
    return this.prisma.calculationRun.findFirst({
      orderBy: { startedAt: "desc" },
    });
  }

  getVersions() {
    return {
      configVersion: CONFIG_VERSION,
      target: TARGET,
      characteristics: INDICATORS,
    };
  }

  async listHeroes() {
    const run = await this.latestSuccessfulRun();
    if (!run) return { run: null, heroes: [] };

    const rows = await this.prisma.characteristicScore.findMany({
      where: { runId: run.id },
      include: {
        hero: {
          select: {
            localizedName: true,
            primaryAttr: true,
            attackType: true,
          },
        },
      },
    });

    const byHero = new Map<
      number,
      {
        heroId: number;
        heroName: string;
        primaryAttr: string;
        attackType: string;
        scores: Record<string, { score: number | null; status: string }>;
      }
    >();

    for (const row of rows) {
      const entry = byHero.get(row.heroId) ?? {
        heroId: row.heroId,
        heroName: row.hero.localizedName,
        primaryAttr: row.hero.primaryAttr,
        attackType: row.hero.attackType,
        scores: {},
      };
      entry.scores[row.characteristic] = {
        score: row.score,
        status: row.status,
      };
      byHero.set(row.heroId, entry);
    }

    const heroes = [...byHero.values()].sort((left, right) =>
      left.heroName.localeCompare(right.heroName),
    );

    return { run, heroes };
  }

  async getHero(heroId: number) {
    const run = await this.latestSuccessfulRun();
    if (!run) return { run: null, hero: null, characteristics: [] };

    const [hero, characteristics] = await Promise.all([
      this.prisma.hero.findUnique({
        where: { id: heroId },
        select: {
          id: true,
          localizedName: true,
          primaryAttr: true,
          attackType: true,
          roles: true,
        },
      }),
      this.prisma.characteristicScore.findMany({
        where: { runId: run.id, heroId },
        orderBy: { characteristic: "asc" },
      }),
    ]);

    return { run, hero, characteristics };
  }

  async getBreakdown(heroId: number) {
    const run = await this.latestSuccessfulRun();
    if (!run) return { run: null, indicators: [] };

    const indicators = await this.prisma.heroIndicator.findMany({
      where: { runId: run.id, heroId },
      orderBy: [{ characteristic: "asc" }, { indicator: "asc" }],
    });

    return { run, indicators };
  }

  async getStatus() {
    const run = await this.prisma.calculationRun.findFirst({
      orderBy: { startedAt: "desc" },
    });

    if (!run) {
      return { run: null, counts: null };
    }

    const [indicators, scores, characteristics] = await Promise.all([
      this.prisma.heroIndicator.count({ where: { runId: run.id } }),
      this.prisma.indicatorScore.count({ where: { runId: run.id } }),
      this.prisma.characteristicScore.count({ where: { runId: run.id } }),
    ]);

    return {
      run,
      counts: { indicators, scores, characteristics },
      configVersion: CONFIG_VERSION,
    };
  }

  private latestSuccessfulRun() {
    return this.prisma.calculationRun.findFirst({
      where: { status: "SUCCESS" },
      orderBy: { startedAt: "desc" },
    });
  }

  private async loadCcConfig(): Promise<CcAbilityConfigMap> {
    const rows = await this.prisma.ccAbilityConfig.findMany({
      include: { ability: { select: { abilityKey: true } } },
    });
    return new Map(
      rows.map((row) => [
        row.ability.abilityKey,
        {
          dispelType: row.dispelType as CcDispelType,
          piercesImmunity: row.piercesImmunity,
        },
      ]),
    );
  }
}
