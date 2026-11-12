import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  INDICATORS,
  INTERNAL_WEIGHTS,
  scoreFromPercentile,
} from "../characteristics/config";
import { DamageProfileService } from "../damage-profile/damage-profile.service";
import {
  DEFAULT_DAMAGE_PROFILE,
  damageWeights,
} from "../damage-profile/damage-profile.types";
import type {
  CharacteristicName,
  CalculationStatus,
} from "../characteristics/types";
import { percentileRank } from "./percentile";

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly damageProfiles: DamageProfileService,
  ) {}

  async scoreRun(runId: number): Promise<{ indicators: number; characteristics: number }> {
    const indicators = await this.prisma.heroIndicator.findMany({
      where: { runId },
    });
    const profiles = await this.damageProfiles.loadMap();

    const byIndicator = new Map<string, typeof indicators>();
    for (const indicator of indicators) {
      const list = byIndicator.get(indicator.indicator) ?? [];
      list.push(indicator);
      byIndicator.set(indicator.indicator, list);
    }

    const scoreData: Prisma.IndicatorScoreCreateManyInput[] = [];

    for (const [indicator, items] of byIndicator) {
      const valid = items.filter(
        (item) =>
          item.rawValue !== null &&
          (item.status === "SUPPORTED" || item.status === "PARTIAL"),
      );
      const values = valid
        .map((item) => item.rawValue as number)
        .sort((left, right) => left - right);
      const positiveValues = values.filter((value) => value > 0);
      const populationSize = values.length;

      for (const item of items) {
        if (
          item.rawValue === null ||
          (item.status !== "SUPPORTED" && item.status !== "PARTIAL")
        ) {
          scoreData.push({
            runId,
            heroId: item.heroId,
            indicator,
            characteristic: item.characteristic,
            rawValue: item.rawValue,
            percentile: null,
            score: null,
            populationSize,
            status: item.status,
          });
          continue;
        }

        const rawValue = item.rawValue;
        const percentile = percentileRank(rawValue, positiveValues);

        scoreData.push({
          runId,
          heroId: item.heroId,
          indicator,
          characteristic: item.characteristic,
          rawValue,
          percentile,
          score: scoreFromPercentile(percentile),
          populationSize,
          status: item.status,
        });
      }
    }

    for (let index = 0; index < scoreData.length; index += 100) {
      await this.prisma.indicatorScore.createMany({
        data: scoreData.slice(index, index + 100),
      });
    }

    const heroes = [...new Set(indicators.map((item) => item.heroId))];
    const characteristicData: Prisma.CharacteristicScoreCreateManyInput[] = [];

    for (const heroId of heroes) {
      const heroScores = scoreData.filter((item) => item.heroId === heroId);
      for (const characteristic of Object.keys(
        INDICATORS,
      ) as CharacteristicName[]) {
        const expected = INDICATORS[characteristic].map((item) => item.key);
        const relevant = expected
          .map((key) => heroScores.find((item) => item.indicator === key))
          .filter((item): item is NonNullable<typeof item> => Boolean(item));
        const valid = relevant.filter((item) => item.score !== null);
        const weights =
          characteristic === "damage"
            ? damageWeights(
                profiles.get(heroId) ?? DEFAULT_DAMAGE_PROFILE,
              )
            : INTERNAL_WEIGHTS[characteristic];

        if (valid.length !== expected.length) {
          characteristicData.push({
            runId,
            heroId,
            characteristic,
            score: null,
            status: "UNSUPPORTED",
            weights: toJson(weights),
            indicators: toJson(relevant),
          });
          continue;
        }

        const score = valid.reduce(
          (sum, item) => sum + (weights[item.indicator] ?? 0) * (item.score ?? 0),
          0,
        );
        const status: CalculationStatus = valid.some(
          (item) => item.status === "PARTIAL",
        )
          ? "PARTIAL"
          : "SUPPORTED";

        characteristicData.push({
          runId,
          heroId,
          characteristic,
          score,
          status,
          weights: toJson(weights),
          indicators: toJson(relevant),
        });
      }
    }

    for (let index = 0; index < characteristicData.length; index += 100) {
      await this.prisma.characteristicScore.createMany({
        data: characteristicData.slice(index, index + 100),
      });
    }

    this.logger.log(
      `Scoring run ${runId}: ${scoreData.length} skor indikator, ${characteristicData.length} skor karakteristik.`,
    );

    return {
      indicators: scoreData.length,
      characteristics: characteristicData.length,
    };
  }
}
