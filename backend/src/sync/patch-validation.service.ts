import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { ValveClient } from "../data-sources/valve/valve.client";
import type { ValvePatchNotesResponse } from "../data-sources/valve/valve.types";
import { PrismaService } from "../prisma/prisma.service";
import { RawStoreService } from "./raw-store.service";

export interface PatchChangeDraft {
  patch: string;
  heroId: number | null;
  abilityId: number | null;
  abilityValveId?: number | null;
  kind: string;
  note: string;
}

export interface PatchValidationResult {
  patch: string;
  heroNotes: number;
  abilityNotes: number;
  rawPath: string;
}

export function collectPatchChanges(
  patch: string,
  notes: ValvePatchNotesResponse,
): PatchChangeDraft[] {
  const changes: PatchChangeDraft[] = [];

  for (const hero of notes.heroes ?? []) {
    for (const note of hero.hero_notes ?? []) {
      changes.push({
        patch,
        heroId: hero.hero_id,
        abilityId: null,
        abilityValveId: null,
        kind: "hero_note",
        note: note.note,
      });
    }

    for (const ability of hero.abilities ?? []) {
      for (const note of ability.ability_notes ?? []) {
        changes.push({
          patch,
          heroId: hero.hero_id,
          abilityId: null,
          abilityValveId: ability.ability_id,
          kind: "ability_note",
          note: note.note,
        });
      }
    }
  }

  return changes;
}

@Injectable()
export class PatchValidationService {
  private readonly logger = new Logger(PatchValidationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly valve: ValveClient,
    private readonly raw: RawStoreService,
    private readonly config: ConfigService,
  ) {}

  async validate(patch: string): Promise<PatchValidationResult> {
    const locale = this.config.get<string>("VALVE_LOCALE") ?? "english";
    const patchList = await this.valve.fetchPatchList(locale);
    const entry = patchList.patches.find(
      (item) => item.patch_number === patch,
    );

    if (!entry) {
      throw new Error(
        `Patch ${patch} tidak ditemukan pada daftar patch Valve.`,
      );
    }

    const notes = await this.valve.fetchPatchNotes(patch, locale);
    const dir = await this.raw.createRunDir("valve");
    const rawPath = await this.raw.save(dir, `patchnotes-${patch}`, notes);

    const changes = collectPatchChanges(patch, notes);
    const [heroes, abilities] = await Promise.all([
      this.prisma.hero.findMany({ select: { id: true } }),
      this.prisma.ability.findMany({
        select: { id: true, valveId: true, heroId: true },
      }),
    ]);

    const knownHeroIds = new Set(heroes.map((hero) => hero.id));
    const abilityByValveId = new Map<string, number>();

    for (const ability of abilities) {
      if (ability.valveId !== null) {
        abilityByValveId.set(
          `${ability.heroId}:${ability.valveId}`,
          ability.id,
        );
      }
    }

    const safeChanges: PatchChangeDraft[] = changes.map((change) => {
      const missingHero =
        change.heroId !== null && !knownHeroIds.has(change.heroId);
      let resolvedAbilityId = change.abilityId;

      if (
        resolvedAbilityId === null &&
        change.abilityValveId !== null &&
        change.abilityValveId !== undefined &&
        change.heroId !== null
      ) {
        resolvedAbilityId =
          abilityByValveId.get(`${change.heroId}:${change.abilityValveId}`) ??
          null;
      }

      const missingAbility =
        resolvedAbilityId === null &&
        (change.abilityId !== null ||
          (change.abilityValveId ?? null) !== null);

      return {
        ...change,
        heroId: missingHero ? null : change.heroId,
        abilityId: missingAbility ? null : resolvedAbilityId,
        note: missingAbility
          ? `${change.note} (ability_id ${change.abilityValveId ?? change.abilityId} tidak ada di constants)`
          : change.note,
      };
    });

    await this.prisma.$transaction(
      async (tx) => {
        await tx.patchChange.deleteMany({ where: { patch } });

        for (const change of safeChanges) {
          await tx.patchChange.create({
            data: {
              patch: change.patch,
              heroId: change.heroId,
              abilityId: change.abilityId,
              kind: change.kind,
              note: change.note,
            },
          });
        }

        await tx.ability.updateMany({
          data: { validationStatus: "VERIFIED" },
        });
      },
      { timeout: 120000 },
    );

    await this.prisma.dataSource.upsert({
      where: {
        sourceName_gameVersion_sourceRevision: {
          sourceName: "VALVE_PATCH_NOTES",
          gameVersion: patch,
          sourceRevision: `${patch}-${entry.patch_timestamp}`,
        },
      },
      create: {
        sourceName: "VALVE_PATCH_NOTES",
        gameVersion: patch,
        sourceRevision: `${patch}-${entry.patch_timestamp}`,
        validationStatus: "VERIFIED",
        notes: `${safeChanges.length} catatan patch dari Valve.`,
        rawPath,
      },
      update: {
        fetchedAt: new Date(),
        validationStatus: "VERIFIED",
        notes: `${safeChanges.length} catatan patch dari Valve.`,
        rawPath,
      },
    });

    const result: PatchValidationResult = {
      patch,
      heroNotes: safeChanges.filter((item) => item.kind === "hero_note").length,
      abilityNotes: safeChanges.filter((item) => item.kind === "ability_note").length,
      rawPath,
    };

    this.logger.log(
      `Patch ${patch}: ${result.heroNotes} catatan hero, ${result.abilityNotes} catatan ability.`,
    );
    return result;
  }
}
