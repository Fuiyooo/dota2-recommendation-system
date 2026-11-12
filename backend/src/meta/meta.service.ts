import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { MetaQueryDto } from "./meta-query.dto";

const SNAPSHOT_SELECT = {
  id: true,
  patch: true,
  bracket: true,
  week: true,
  source: true,
  timeWindow: true,
  capturedAt: true,
} satisfies Prisma.MetaSnapshotSelect;

const STAT_SELECT = {
  id: true,
  heroId: true,
  position: true,
  scope: true,
  pickCount: true,
  winCount: true,
  pickRate: true,
  winRate: true,
  matchCount: true,
  bracket: true,
  timeWindow: true,
  source: true,
  hero: {
    select: {
      localizedName: true,
      primaryAttr: true,
      attackType: true,
    },
  },
} satisfies Prisma.HeroMetaStatsSelect;

@Injectable()
export class MetaService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(query: MetaQueryDto) {
    const snapshot = await this.findSnapshot(query);
    if (!snapshot) return { snapshot: null, stats: [] };

    const stats = await this.prisma.heroMetaStats.findMany({
      where: {
        snapshotId: snapshot.id,
        ...(query.position ? { position: query.position } : {}),
      },
      select: STAT_SELECT,
      orderBy: [{ position: "asc" }, { pickRate: "desc" }],
    });

    return { snapshot, stats };
  }

  async forHero(heroId: number, query: MetaQueryDto) {
    const snapshot = await this.findSnapshot(query);
    if (!snapshot) return { snapshot: null, stats: [] };

    const stats = await this.prisma.heroMetaStats.findMany({
      where: { snapshotId: snapshot.id, heroId },
      select: STAT_SELECT,
      orderBy: [{ position: "asc" }],
    });

    return { snapshot, stats };
  }

  async positions(heroId: number, query: MetaQueryDto) {
    return this.forHero(heroId, query);
  }

  private findSnapshot(query: MetaQueryDto) {
    return this.prisma.metaSnapshot.findFirst({
      where: {
        ...(query.bracket ? { bracket: query.bracket } : {}),
        ...(query.source ? { source: query.source } : {}),
      },
      select: SNAPSHOT_SELECT,
      orderBy: { capturedAt: "desc" },
    });
  }
}
