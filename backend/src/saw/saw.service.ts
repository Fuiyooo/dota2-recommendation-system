import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  CHARACTERISTIC_LABELS,
  normalizeWeights,
} from "../characteristics/config";
import type { CharacteristicName } from "../characteristics/types";
import { pickMainPositionStats } from "./main-position";

const CHARACTERISTICS: CharacteristicName[] = [
  "damage",
  "durability",
  "crowdControl",
  "mobility",
];

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

@Injectable()
export class SawService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(weightsInput?: Partial<Record<CharacteristicName, number>>) {
    const run = await this.prisma.calculationRun.findFirst({
      where: { status: "SUCCESS" },
      orderBy: { startedAt: "desc" },
    });

    if (!run) {
      throw new NotFoundException(
        "Belum ada calculation run. Jalankan kalkulasi karakteristik terlebih dahulu.",
      );
    }

    const rows = await this.prisma.characteristicScore.findMany({
      where: { runId: run.id },
      include: {
        hero: {
          select: { localizedName: true, complexity: true, attackType: true },
        },
      },
    });
    const positionStats = await this.loadPositionStats();

    const weights = normalizeWeights(weightsInput ?? {});
    const complete = rows.filter((row) => row.score !== null);
    const maxByCharacteristic = new Map<CharacteristicName, number>();

    for (const characteristic of CHARACTERISTICS) {
      const values = complete
        .filter((row) => row.characteristic === characteristic)
        .map((row) => row.score ?? 0);
      maxByCharacteristic.set(characteristic, Math.max(0, ...values));
    }

    const results = complete
      .filter((row) => CHARACTERISTICS.includes(row.characteristic as CharacteristicName))
      .map((row) => {
        const characteristic = row.characteristic as CharacteristicName;
        const max = maxByCharacteristic.get(characteristic) ?? 0;
        const normalized = max > 0 ? (row.score ?? 0) / max : 0;
        return {
          heroId: row.heroId,
          heroName: row.hero.localizedName,
          characteristic,
          normalized,
        };
      });

    const byHero = new Map<
      number,
      {
        heroName: string;
        complexity: number | null;
        attackType: string;
        normalized: Record<string, number>;
      }
    >();

    for (const row of results) {
      const entry = byHero.get(row.heroId) ?? {
        heroName: row.heroName,
        complexity: rows.find((item) => item.heroId === row.heroId)?.hero
          .complexity ?? null,
        attackType:
          rows.find((item) => item.heroId === row.heroId)?.hero.attackType ??
          "Unknown",
        normalized: {},
      };
      entry.normalized[row.characteristic] = row.normalized;
      byHero.set(row.heroId, entry);
    }

    const scored = [...byHero.entries()]
      .filter(([, entry]) =>
        CHARACTERISTICS.every(
          (characteristic) => entry.normalized[characteristic] !== undefined,
        ),
      )
      .map(([heroId, entry]) => {
        const stat = positionStats.get(heroId);
        return {
          heroId,
          heroName: entry.heroName,
          complexity: entry.complexity,
          attackType: entry.attackType,
          mainPosition: stat?.position ?? null,
          pickRate: stat?.pickRate ?? 0,
          pickCount: stat?.pickCount ?? 0,
          normalizedScores: entry.normalized,
          finalScore: CHARACTERISTICS.reduce(
            (sum, characteristic) =>
              sum + weights[characteristic] * entry.normalized[characteristic],
            0,
          ),
        };
      })
      .sort(
        (left, right) =>
          right.finalScore - left.finalScore ||
          right.pickRate - left.pickRate ||
          right.pickCount - left.pickCount ||
          left.heroName.localeCompare(right.heroName),
      )
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    const sawRun = await this.prisma.sawRun.create({
      data: {
        runId: run.id,
        weights: toJson(weights),
        results: {
          create: scored.map((entry) => ({
            heroId: entry.heroId,
            normalizedScores: toJson(entry.normalizedScores),
            finalScore: entry.finalScore,
            rank: entry.rank,
            status: "SUPPORTED",
            mainPosition: entry.mainPosition,
            pickRate: entry.pickRate,
            pickCount: entry.pickCount,
          })),
        },
      },
    });

    return {
      sawRun: {
        id: sawRun.id,
        runId: run.id,
        weights,
        labels: CHARACTERISTIC_LABELS,
        createdAt: sawRun.createdAt,
      },
      totalHeroes: scored.length,
      results: scored.map((entry) => ({
        heroId: entry.heroId,
        heroName: entry.heroName,
        complexity: entry.complexity,
        attackType: entry.attackType,
        mainPosition: entry.mainPosition,
        pickRate: entry.pickRate,
        pickCount: entry.pickCount,
        rank: entry.rank,
        finalScore: entry.finalScore,
        normalizedScores: entry.normalizedScores,
      })),
    };
  }

  async getLatest() {
    const sawRun = await this.prisma.sawRun.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!sawRun) {
      return { sawRun: null, results: [] };
    }

    const results = await this.prisma.sawResult.findMany({
      where: { sawRunId: sawRun.id },
      orderBy: { rank: "asc" },
      include: {
        hero: {
          select: { localizedName: true, complexity: true, attackType: true },
        },
      },
    });

    return {
      sawRun: {
        id: sawRun.id,
        runId: sawRun.runId,
        weights: sawRun.weights,
        createdAt: sawRun.createdAt,
      },
      results: results.map((result) => ({
        heroId: result.heroId,
        heroName: result.hero.localizedName,
        complexity: result.hero.complexity,
        attackType: result.hero.attackType,
        mainPosition: result.mainPosition,
        pickRate: result.pickRate ?? 0,
        pickCount: result.pickCount ?? 0,
        rank: result.rank,
        finalScore: result.finalScore,
        normalizedScores: result.normalizedScores,
      })),
    };
  }

  async getHero(heroId: number) {
    const result = await this.prisma.sawResult.findFirst({
      where: { heroId },
      orderBy: { sawRunId: "desc" },
      include: {
        hero: {
          select: { localizedName: true, complexity: true, attackType: true },
        },
        sawRun: true,
      },
    });

    if (!result) {
      throw new NotFoundException(
        `Hasil SAW untuk hero ${heroId} belum tersedia.`,
      );
    }

    return {
      heroId: result.heroId,
      heroName: result.hero.localizedName,
      complexity: result.hero.complexity,
      attackType: result.hero.attackType,
      mainPosition: result.mainPosition,
      pickRate: result.pickRate ?? 0,
      pickCount: result.pickCount ?? 0,
      rank: result.rank,
      finalScore: result.finalScore,
      normalizedScores: result.normalizedScores,
      weights: result.sawRun.weights,
    };
  }

  private async loadPositionStats() {
    const snapshot = await this.prisma.metaSnapshot.findFirst({
      orderBy: { capturedAt: "desc" },
      select: { id: true },
    });
    if (!snapshot) return new Map();

    const rows = await this.prisma.heroMetaStats.findMany({
      where: { snapshotId: snapshot.id },
      select: {
        heroId: true,
        position: true,
        pickRate: true,
        matchCount: true,
      },
    });

    return pickMainPositionStats(rows);
  }
}
