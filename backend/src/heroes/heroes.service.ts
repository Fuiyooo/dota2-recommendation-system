import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const HERO_SUMMARY_SELECT = {
  id: true,
  name: true,
  localizedName: true,
  primaryAttr: true,
  attackType: true,
  roles: true,
  complexity: true,
  baseStr: true,
  baseAgi: true,
  baseInt: true,
  strGain: true,
  agiGain: true,
  intGain: true,
  attackRange: true,
  moveSpeed: true,
  armor: true,
  syncedAt: true,
} satisfies Prisma.HeroSelect;

const ABILITY_SELECT = {
  id: true,
  valveId: true,
  abilityKey: true,
  displayName: true,
  abilityType: true,
  isInnate: true,
  hasScepter: true,
  hasShard: true,
  maxLevel: true,
  damageType: true,
  talentTier: true,
  talentLevel: true,
  linkedAbilityKey: true,
  specialValues: true,
  rawData: true,
  validationStatus: true,
} satisfies Prisma.AbilitySelect;

@Injectable()
export class HeroesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.hero.findMany({
      select: HERO_SUMMARY_SELECT,
      orderBy: { localizedName: "asc" },
    });
  }

  async findOne(heroId: number) {
    const hero = await this.prisma.hero.findUnique({
      where: { id: heroId },
      select: {
        ...HERO_SUMMARY_SELECT,
        abilities: {
          select: ABILITY_SELECT,
          orderBy: [{ sortOrder: "asc" }],
        },
      },
    });

    if (!hero) {
      throw new NotFoundException(`Hero ${heroId} tidak ditemukan.`);
    }

    return hero;
  }

  async findAbilities(heroId: number) {
    const hero = await this.prisma.hero.findUnique({
      where: { id: heroId },
      select: { id: true },
    });

    if (!hero) {
      throw new NotFoundException(`Hero ${heroId} tidak ditemukan.`);
    }

    return this.prisma.ability.findMany({
      where: { heroId },
      select: ABILITY_SELECT,
      orderBy: [{ sortOrder: "asc" }],
    });
  }
}
