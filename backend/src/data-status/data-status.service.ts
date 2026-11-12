import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DataStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getStatus() {
    const patch = this.targetPatch();
    const [
      heroCount,
      abilityCount,
      talentCount,
      metaStatCount,
      sources,
      syncRuns,
      patchRecord,
      snapshot,
      changeCount,
      recentChanges,
    ] = await Promise.all([
      this.prisma.hero.count(),
      this.prisma.ability.count({ where: { abilityType: { not: "Talent" } } }),
      this.prisma.ability.count({ where: { abilityType: "Talent" } }),
      this.prisma.heroMetaStats.count(),
      this.prisma.dataSource.findMany({
        orderBy: { fetchedAt: "desc" },
        take: 20,
      }),
      this.prisma.syncRun.findMany({
        orderBy: { startedAt: "desc" },
        take: 10,
      }),
      this.prisma.dataSource.findFirst({
        where: { sourceName: "VALVE_PATCH_NOTES", gameVersion: patch },
        orderBy: { fetchedAt: "desc" },
      }),
      this.prisma.metaSnapshot.findFirst({
        orderBy: { capturedAt: "desc" },
        select: {
          id: true,
          patch: true,
          bracket: true,
          week: true,
          source: true,
          timeWindow: true,
          capturedAt: true,
          _count: { select: { stats: true } },
        },
      }),
      this.prisma.patchChange.count({ where: { patch } }),
      this.prisma.patchChange.findMany({
        where: { patch },
        orderBy: { createdAt: "desc" },
        take: 25,
        include: {
          hero: { select: { localizedName: true } },
          ability: { select: { displayName: true, abilityKey: true } },
        },
      }),
    ]);

    return {
      targetPatch: patch,
      patch: {
        name: patch,
        verified: Boolean(patchRecord),
        fetchedAt: patchRecord?.fetchedAt ?? null,
        sourceRevision: patchRecord?.sourceRevision ?? null,
      },
      counts: {
        heroes: heroCount,
        abilities: abilityCount,
        talents: talentCount,
        metaStats: metaStatCount,
      },
      snapshot,
      sources,
      syncRuns,
      validation: {
        totalChanges: changeCount,
        recent: recentChanges,
      },
    };
  }

  getSources() {
    return this.prisma.dataSource.findMany({
      orderBy: { fetchedAt: "desc" },
    });
  }

  async getPatch() {
    const patch = this.targetPatch();
    const [record, changes] = await Promise.all([
      this.prisma.dataSource.findFirst({
        where: { sourceName: "VALVE_PATCH_NOTES", gameVersion: patch },
        orderBy: { fetchedAt: "desc" },
      }),
      this.prisma.patchChange.count({ where: { patch } }),
    ]);

    return {
      targetPatch: patch,
      verified: Boolean(record),
      sourceRevision: record?.sourceRevision ?? null,
      fetchedAt: record?.fetchedAt ?? null,
      changes,
    };
  }

  private targetPatch(): string {
    return this.config.get<string>("PATCH_TARGET") ?? "7.41f";
  }
}
