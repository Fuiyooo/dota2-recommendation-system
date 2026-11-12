import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { OpenDotaClient } from "../data-sources/opendota/opendota.client";
import { ValveClient } from "../data-sources/valve/valve.client";
import type { ValveHero } from "../data-sources/valve/valve.types";
import { PrismaService } from "../prisma/prisma.service";
import {
  normalizeHeroBundle,
  type NormalizedAbility,
  type NormalizedTalent,
} from "./normalizers";
import { PatchValidationService } from "./patch-validation.service";
import { RawStoreService } from "./raw-store.service";
import { mapLimit } from "./utils";

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

interface HeroBundle {
  hero: ReturnType<typeof normalizeHeroBundle>["hero"];
  abilities: NormalizedAbility[];
  talents: NormalizedTalent[];
  rawPath: string;
}

export interface ConstantsSyncResult {
  heroes: number;
  abilities: number;
  talents: number;
  rawPath: string;
  patch: Awaited<ReturnType<PatchValidationService["validate"]>>;
}

@Injectable()
export class ConstantsSyncService {
  private readonly logger = new Logger(ConstantsSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly valve: ValveClient,
    private readonly opendota: OpenDotaClient,
    private readonly raw: RawStoreService,
    private readonly patchValidation: PatchValidationService,
    private readonly config: ConfigService,
  ) {}

  async sync(): Promise<ConstantsSyncResult> {
    const patch = this.config.get<string>("PATCH_TARGET") ?? "7.41f";
    const locale = this.config.get<string>("VALVE_LOCALE") ?? "english";
    const run = await this.prisma.syncRun.create({
      data: { source: "CONSTANTS", status: "RUNNING" },
    });

    try {
      this.logger.log("Mengambil daftar hero dari Valve Datafeed...");
      const heroList = await this.valve.fetchHeroList(locale);
      const runDir = await this.raw.createRunDir("valve");
      const heroListPath = await this.raw.save(runDir, "herolist", heroList);

      this.logger.log("Mengambil constants pelengkap dari OpenDota...");
      const [opendotaHeroes, opendotaAbilities, commit] = await Promise.all([
        this.opendota.fetchHeroes(),
        this.opendota.fetchAbilities(),
        this.opendota.fetchConstantsCommit(),
      ]);

      const summaries = heroList.result.data.heroes;
      this.logger.log(
        `Mengambil herodata untuk ${summaries.length} hero (maksimal 4 request paralel)...`,
      );

      const failures: Array<{ id: number; name: string; message: string }> = [];
      const fetched = await mapLimit(summaries, 3, async (summary) => {
        try {
          const response = await this.valve.fetchHeroData(summary.id, locale);
          const valveHero = response.result.data.heroes[0] as ValveHero;
          const rawPath = await this.raw.save(
            runDir,
            `hero-${summary.id}`,
            response,
          );
          const normalized = normalizeHeroBundle(
            valveHero,
            opendotaHeroes[String(summary.id)],
          );
          return {
            ...normalized,
            rawPath,
          } satisfies HeroBundle;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failures.push({ id: summary.id, name: summary.name, message });
          this.logger.warn(
            `Hero ${summary.name} dilewati: ${message.slice(0, 160)}`,
          );
          return null;
        }
      });

      const bundles = fetched.filter(
        (bundle): bundle is HeroBundle => bundle !== null,
      );
      if (bundles.length === 0) {
        throw new Error("Tidak ada hero yang berhasil diambil dari Valve.");
      }
      if (failures.length > 0) {
        this.logger.warn(
          `${failures.length} hero gagal diambil, data lama dipertahankan.`,
        );
      }

      const opendotaDir = await this.raw.createRunDir("opendota");
      await this.raw.save(opendotaDir, "heroes", opendotaHeroes);
      await this.raw.save(opendotaDir, "abilities", opendotaAbilities);

      let abilityCount = 0;
      let talentCount = 0;

      await this.prisma.$transaction(
        async (tx) => {
          for (const bundle of bundles) {
            const hero = bundle.hero;
            const heroData = {
              name: hero.name,
              localizedName: hero.localizedName,
              primaryAttr: hero.primaryAttr,
              attackType: hero.attackType,
              roles: toJson(hero.roles),
              baseStr: hero.baseStr,
              baseAgi: hero.baseAgi,
              baseInt: hero.baseInt,
              strGain: hero.strGain,
              agiGain: hero.agiGain,
              intGain: hero.intGain,
              complexity: hero.complexity,
              attackRange: hero.attackRange,
              moveSpeed: hero.moveSpeed,
              armor: hero.armor,
              damageMin: hero.damageMin,
              damageMax: hero.damageMax,
              attackRate: hero.attackRate,
              attackPoint: hero.attackPoint,
              baseHealth: hero.baseHealth,
              baseMana: hero.baseMana,
              baseMagicResistance: hero.baseMagicResistance,
              rawConstants: toJson(hero.rawConstants),
              syncedAt: new Date(),
            };

            await tx.hero.upsert({
              where: { id: hero.id },
              create: { id: hero.id, ...heroData },
              update: heroData,
            });

            for (const ability of bundle.abilities) {
              const data = {
                abilityKey: ability.abilityKey,
                displayName: ability.displayName,
                heroId: hero.id,
                abilityType: ability.abilityType,
                isInnate: ability.isInnate,
                hasScepter: ability.hasScepter,
                hasShard: ability.hasShard,
                maxLevel: ability.maxLevel,
                damageType: ability.damageType,
                sortOrder: ability.sortOrder,
                talentTier: null,
                talentLevel: null,
                linkedAbilityKey: null,
                specialValues: toJson(ability.specialValues),
                rawData: toJson(ability.rawData),
                validationStatus: "VERIFIED",
                syncedAt: new Date(),
              };

              await tx.ability.upsert({
                where: {
                  heroId_abilityKey: {
                    heroId: hero.id,
                    abilityKey: ability.abilityKey,
                  },
                },
                create: {
                  valveId: ability.id,
                  ...data,
                },
                update: {
                  valveId: ability.id,
                  ...data,
                },
              });
              abilityCount += 1;
            }

            for (const talent of bundle.talents) {
              const data = {
                abilityKey: talent.abilityKey,
                displayName: talent.displayName,
                heroId: hero.id,
                abilityType: "Talent",
                isInnate: false,
                hasScepter: false,
                hasShard: false,
                maxLevel: 1,
                damageType: null,
                sortOrder: talent.sortOrder,
                talentTier: talent.talentTier,
                talentLevel: talent.talentLevel,
                linkedAbilityKey: talent.linkedAbilityKey,
                specialValues: toJson(talent.specialValues),
                rawData: toJson(talent.rawData),
                validationStatus: "VERIFIED",
                syncedAt: new Date(),
              };

              await tx.ability.upsert({
                where: {
                  heroId_abilityKey: {
                    heroId: hero.id,
                    abilityKey: talent.abilityKey,
                  },
                },
                create: {
                  valveId: talent.id,
                  ...data,
                },
                update: {
                  valveId: talent.id,
                  ...data,
                },
              });
              talentCount += 1;
            }
          }
        },
        { timeout: 180000, maxWait: 15000 },
      );

      await this.prisma.dataSource.upsert({
        where: {
          sourceName_gameVersion_sourceRevision: {
            sourceName: "VALVE_DATAFEED",
            gameVersion: patch,
            sourceRevision: `datafeed-${new Date().toISOString().slice(0, 10)}`,
          },
        },
        create: {
          sourceName: "VALVE_DATAFEED",
          gameVersion: patch,
          sourceRevision: `datafeed-${new Date().toISOString().slice(0, 10)}`,
          validationStatus: "VERIFIED",
          notes: `${bundles.length} hero, ${abilityCount} ability, ${talentCount} talent. Sumber utama damage dan mekanisme.`,
          rawPath: heroListPath,
        },
        update: {
          fetchedAt: new Date(),
          validationStatus: "VERIFIED",
          notes: `${bundles.length} hero, ${abilityCount} ability, ${talentCount} talent. Sumber utama damage dan mekanisme.`,
          rawPath: heroListPath,
        },
      });

      await this.prisma.dataSource.upsert({
        where: {
          sourceName_gameVersion_sourceRevision: {
            sourceName: "OPENDOTA_DOTACONSTANTS",
            gameVersion: patch,
            sourceRevision: commit,
          },
        },
        create: {
          sourceName: "OPENDOTA_DOTACONSTANTS",
          gameVersion: patch,
          sourceRevision: commit,
          validationStatus: "SUPPLEMENTAL",
          notes:
            "Sumber pelengkap untuk role hero dan attack_point. Nilai damage dan atribut tidak dipakai dari sumber ini.",
          rawPath: opendotaDir,
        },
        update: {
          fetchedAt: new Date(),
          validationStatus: "SUPPLEMENTAL",
          notes:
            "Sumber pelengkap untuk role hero dan attack_point. Nilai damage dan atribut tidak dipakai dari sumber ini.",
          rawPath: opendotaDir,
        },
      });

      this.logger.log("Menjalankan validasi patch...");
      const patchResult = await this.patchValidation.validate(patch);

      await this.prisma.syncRun.update({
        where: { id: run.id },
        data: {
          status: failures.length > 0 ? "PARTIAL" : "SUCCESS",
          finishedAt: new Date(),
          heroCount: bundles.length,
          abilityCount: abilityCount + talentCount,
          note: `Patch ${patch}. ${patchResult.heroNotes + patchResult.abilityNotes} catatan patch dari Valve.${
            failures.length > 0
              ? ` ${failures.length} hero gagal: ${failures
                  .map((failure) => failure.name)
                  .slice(0, 10)
                  .join(", ")}.`
              : ""
          }`,
        },
      });

      const result: ConstantsSyncResult = {
        heroes: bundles.length,
        abilities: abilityCount,
        talents: talentCount,
        rawPath: runDir,
        patch: patchResult,
      };
      this.logger.log(
        `Sync constants selesai: ${result.heroes} hero, ${result.abilities} ability, ${result.talents} talent.`,
      );
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.syncRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          note: message.slice(0, 500),
        },
      });
      this.logger.error(`Sync constants gagal: ${message}`);
      throw error;
    }
  }
}
