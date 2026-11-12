import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  DAMAGE_TYPES,
  isValidSecondary,
  toDamageProfile,
} from "./damage-profile.types";
import type { DamageProfile } from "./damage-profile.types";

export interface DamageProfileInput {
  main: string;
  secondary: string;
  notes?: string | null;
}

@Injectable()
export class DamageProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async loadMap(): Promise<Map<number, DamageProfile>> {
    const rows = await this.prisma.heroDamageProfile.findMany();
    return new Map(
      rows.map((row) => [
        row.heroId,
        toDamageProfile(row.main, row.secondary),
      ]),
    );
  }

  async publicList() {
    const rows = await this.prisma.heroDamageProfile.findMany({
      include: { hero: { select: { localizedName: true } } },
      orderBy: { heroId: "asc" },
    });
    return {
      profiles: rows.map((row) => ({
        heroId: row.heroId,
        heroName: row.hero.localizedName,
        main: row.main,
        secondary: row.secondary,
      })),
    };
  }

  async listForAdmin() {
    const [heroes, profiles, run] = await Promise.all([
      this.prisma.hero.findMany({
        select: {
          id: true,
          localizedName: true,
          attackType: true,
          complexity: true,
        },
        orderBy: { localizedName: "asc" },
      }),
      this.prisma.heroDamageProfile.findMany(),
      this.prisma.calculationRun.findFirst({
        where: { status: "SUCCESS" },
        orderBy: { startedAt: "desc" },
      }),
    ]);

    const indicators = run
      ? await this.prisma.heroIndicator.findMany({
          where: { runId: run.id, characteristic: "damage" },
        })
      : [];
    const values = new Map<string, number | null>();
    for (const indicator of indicators) {
      values.set(`${indicator.heroId}:${indicator.indicator}`, indicator.rawValue);
    }

    const byHero = new Map(profiles.map((profile) => [profile.heroId, profile]));
    return {
      runId: run?.id ?? null,
      profiles: heroes.map((hero) => {
        const profile = byHero.get(hero.id);
        return {
          heroId: hero.id,
          heroName: hero.localizedName,
          attackType: hero.attackType,
          complexity: hero.complexity,
          main: profile?.main ?? null,
          secondary: profile?.secondary ?? null,
          notes: profile?.notes ?? null,
          updatedAt: profile?.updatedAt ?? null,
          values: {
            physical: values.get(`${hero.id}:physicalDamage`) ?? null,
            magic: values.get(`${hero.id}:magicDamage`) ?? null,
            pure: values.get(`${hero.id}:pureDamage`) ?? null,
          },
        };
      }),
    };
  }

  async update(heroId: number, input: DamageProfileInput) {
    this.validate(input);
    const hero = await this.prisma.hero.findUnique({
      where: { id: heroId },
      select: { id: true },
    });
    if (!hero) throw new NotFoundException(`Hero ${heroId} tidak ditemukan.`);

    const data = {
      main: input.main,
      secondary: input.secondary,
      notes: input.notes?.trim() || null,
    };
    return this.prisma.heroDamageProfile.upsert({
      where: { heroId },
      create: { heroId, ...data },
      update: data,
    });
  }

  async bulk(rows: Array<DamageProfileInput & { heroId: number }>) {
    for (const row of rows) this.validate(row);
    await this.prisma.$transaction(
      rows.map((row) => {
        const data = {
          main: row.main,
          secondary: row.secondary,
          notes: row.notes?.trim() || null,
        };
        return this.prisma.heroDamageProfile.upsert({
          where: { heroId: row.heroId },
          create: { heroId: row.heroId, ...data },
          update: data,
        });
      }),
    );
    return { updated: rows.length };
  }

  private validate(input: DamageProfileInput): void {
    if (!DAMAGE_TYPES.includes(input.main as never)) {
      throw new BadRequestException(
        `main tidak valid: ${input.main}. Pilih PHYSICAL, MAGICAL, atau PURE.`,
      );
    }
    if (!isValidSecondary(input.main, input.secondary)) {
      throw new BadRequestException(
        "secondary tidak valid. Pilih tipe lain atau NONE.",
      );
    }
  }
}
