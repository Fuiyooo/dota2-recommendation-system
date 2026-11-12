import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { StratzClient } from "../data-sources/stratz/stratz.client";
import type { StratzPositionRow } from "../data-sources/stratz/stratz.types";
import { PrismaService } from "../prisma/prisma.service";

export interface MetaStatDraft {
  heroId: number;
  position: number;
  scope: string;
  pickCount: number;
  winCount: number;
  pickRate: number;
  winRate: number;
  matchCount: number;
  bracket: string;
  timeWindow: string;
  source: string;
  rawStats: unknown;
}

export function positionNumber(value: string): number | null {
  const match = /^POSITION_([1-5])$/.exec(value);
  return match ? Number(match[1]) : null;
}

export function buildMetaStatDrafts(
  rows: StratzPositionRow[],
  bracket: string,
  timeWindow: string,
): MetaStatDraft[] {
  const validRows = rows
    .map((row) => ({ ...row, numericPosition: positionNumber(row.position) }))
    .filter(
      (row): row is StratzPositionRow & { numericPosition: number } =>
        row.numericPosition !== null && row.matchCount > 0,
    );

  const totals = new Map<number, number>();
  for (const row of validRows) {
    totals.set(
      row.numericPosition,
      (totals.get(row.numericPosition) ?? 0) + row.matchCount,
    );
  }

  return validRows.map((row) => {
    const total = totals.get(row.numericPosition) ?? 0;
    return {
      heroId: row.heroId,
      position: row.numericPosition,
      scope: "position",
      pickCount: row.matchCount,
      winCount: row.winCount,
      pickRate: total > 0 ? row.matchCount / total : 0,
      winRate: row.matchCount > 0 ? row.winCount / row.matchCount : 0,
      matchCount: row.matchCount,
      bracket,
      timeWindow,
      source: "STRATZ",
      rawStats: row,
    };
  });
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export interface MetaSyncResult {
  created: boolean;
  snapshotId: number;
  patch: string;
  bracket: string;
  week: number;
  stats: number;
}

@Injectable()
export class MetaSyncService {
  private readonly logger = new Logger(MetaSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stratz: StratzClient,
    private readonly config: ConfigService,
  ) {}

  async sync(): Promise<MetaSyncResult> {
    const patch = this.config.get<string>("PATCH_TARGET") ?? "7.41f";
    const bracket = this.stratz.bracket();

    const heroCount = await this.prisma.hero.count();
    if (heroCount === 0) {
      throw new Error(
        "Tabel hero masih kosong. Jalankan npm run sync:constants terlebih dahulu.",
      );
    }

    const existing = await this.prisma.metaSnapshot.findFirst({
      where: { patch, bracket, source: "STRATZ" },
      include: { _count: { select: { stats: true } } },
    });

    if (existing) {
      const heroes = await this.prisma.heroMetaStats.findMany({
        where: { snapshotId: existing.id },
        select: { heroId: true },
        distinct: ["heroId"],
      });
      await this.prisma.syncRun.create({
        data: {
          source: "META",
          status: "SUCCESS",
          finishedAt: new Date(),
          heroCount: heroes.length,
          note: `Snapshot ${patch} ${bracket} week ${existing.week} sudah ada. Tidak diambil ulang.`,
        },
      });
      this.logger.log(
        `Snapshot ${patch} ${bracket} sudah ada (week ${existing.week}). Tidak diambil ulang.`,
      );
      return {
        created: false,
        snapshotId: existing.id,
        patch: existing.patch,
        bracket: existing.bracket,
        week: existing.week,
        stats: existing._count.stats,
      };
    }

    this.logger.log(
      `Mengambil snapshot STRATZ ${bracket} untuk posisi 1 sampai 5...`,
    );
    const rows = await this.stratz.fetchPositionStats([1, 2, 3, 4, 5]);
    if (rows.length === 0) {
      throw new Error("STRATZ tidak mengembalikan data posisi.");
    }

    const week = Math.max(...rows.map((row) => row.week));
    const currentRows = rows.filter((row) => row.week === week);
    const timeWindow = `week ${week}`;
    const drafts = buildMetaStatDrafts(currentRows, bracket, timeWindow);

    const snapshot = await this.prisma.metaSnapshot.create({
      data: {
        patch,
        bracket,
        week,
        source: "STRATZ",
        timeWindow,
        rawData: toJson(currentRows),
        stats: {
          create: drafts.map((draft) => ({
            heroId: draft.heroId,
            position: draft.position,
            scope: draft.scope,
            pickCount: draft.pickCount,
            winCount: draft.winCount,
            pickRate: draft.pickRate,
            winRate: draft.winRate,
            matchCount: draft.matchCount,
            bracket: draft.bracket,
            timeWindow: draft.timeWindow,
            source: draft.source,
            rawStats: toJson(draft.rawStats),
          })),
        },
      },
    });

    await this.prisma.dataSource.upsert({
      where: {
        sourceName_gameVersion_sourceRevision: {
          sourceName: "STRATZ",
          gameVersion: patch,
          sourceRevision: `${bracket}-week-${week}`,
        },
      },
      create: {
        sourceName: "STRATZ",
        gameVersion: patch,
        sourceRevision: `${bracket}-week-${week}`,
        validationStatus: "VERIFIED",
        notes: `Snapshot posisi 1-5, bracket ${bracket}, ${drafts.length} baris.`,
      },
      update: {
        fetchedAt: new Date(),
        validationStatus: "VERIFIED",
        notes: `Snapshot posisi 1-5, bracket ${bracket}, ${drafts.length} baris.`,
      },
    });

    await this.prisma.syncRun.create({
      data: {
        source: "META",
        status: "SUCCESS",
        finishedAt: new Date(),
        heroCount: new Set(drafts.map((draft) => draft.heroId)).size,
        note: `Snapshot ${patch} ${bracket} week ${week}, ${drafts.length} baris posisi.`,
      },
    });

    this.logger.log(
      `Snapshot tersimpan: week ${week}, ${drafts.length} baris statistik posisi.`,
    );

    return {
      created: true,
      snapshotId: snapshot.id,
      patch,
      bracket,
      week,
      stats: drafts.length,
    };
  }
}
