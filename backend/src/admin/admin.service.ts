import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { CC_MAIN_OVERRIDES } from "../characteristics/crowd-control/cc-main-config";
import { PrismaService } from "../prisma/prisma.service";
import { DamageProfileService } from "../damage-profile/damage-profile.service";
import type { DamageProfileInput } from "../damage-profile/damage-profile.service";
import { DUMMY_HASH, hashPassword, verifyPassword } from "./password";
import { ADMIN_SESSION_HOURS } from "./admin.guard";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

@Injectable()
export class AdminService {
  private readonly attempts = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly profiles: DamageProfileService,
  ) {}

  async login(username: string, password: string, ip: string) {
    this.assertAllowed(ip);
    const user = await this.prisma.adminUser.findUnique({
      where: { username },
    });
    const valid = await verifyPassword(
      password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !valid) {
      this.recordFailure(ip);
      throw new UnauthorizedException("Username atau password salah.");
    }

    this.attempts.delete(ip);
    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const token = await this.jwt.signAsync(
      { sub: user.id, username: user.username },
      { expiresIn: `${ADMIN_SESSION_HOURS}h` },
    );
    return { token, username: user.username };
  }

  async seedAdmin(username: string, password: string) {
    const passwordHash = await hashPassword(password);
    const user = await this.prisma.adminUser.upsert({
      where: { username },
      create: { username, passwordHash },
      update: { passwordHash },
    });
    return { id: user.id, username: user.username };
  }

  listProfiles() {
    return this.profiles.listForAdmin();
  }

  updateProfile(heroId: number, input: DamageProfileInput) {
    return this.profiles.update(heroId, input);
  }

  bulkProfiles(
    rows: Array<DamageProfileInput & { heroId: number }>,
  ) {
    return this.profiles.bulk(rows);
  }

  async listCcAbilities() {
    const [configs, run] = await Promise.all([
      this.prisma.ccAbilityConfig.findMany({
        include: {
          ability: {
            include: {
              hero: { select: { localizedName: true } },
            },
          },
        },
      }),
      this.prisma.calculationRun.findFirst({
        where: { status: "SUCCESS" },
        orderBy: { startedAt: "desc" },
      }),
    ]);

    const details = run
      ? await this.prisma.heroIndicator.findMany({
          where: { runId: run.id, indicator: "disableDuration" },
        })
      : [];
    const byKey = new Map<
      string,
      { hard: boolean; soft: boolean; duration: number; status: string }
    >();
    for (const indicator of details) {
      const detail = (indicator.detail ?? {}) as {
        abilities?: Array<{
          ability?: string;
          hard?: boolean;
          soft?: boolean;
          duration?: number;
        }>;
      };
      const heroName = await this.heroName(indicator.heroId);
      for (const ability of detail.abilities ?? []) {
        if (!ability.ability) continue;
        byKey.set(`${heroName}|${ability.ability}`, {
          hard: Boolean(ability.hard),
          soft: Boolean(ability.soft),
          duration: Number(ability.duration ?? 0),
          status: indicator.status,
        });
      }
    }

    const heroes = await this.prisma.hero.findMany({
      select: { id: true, localizedName: true },
    });
    const heroById = new Map(heroes.map((hero) => [hero.id, hero.localizedName]));

    return {
      runId: run?.id ?? null,
      abilities: configs
        .map((config) => {
          const heroName =
            config.ability.hero.localizedName ?? heroById.get(config.ability.heroId) ?? "";
          const override = CC_MAIN_OVERRIDES[config.ability.abilityKey];
          const detailName = override?.displayName ?? config.ability.displayName;
          const current = byKey.get(`${heroName}|${detailName}`);
          return {
            abilityId: config.abilityId,
            abilityKey: config.ability.abilityKey,
            abilityName: detailName,
            heroName,
            controlType: current?.hard ? "HARD" : current?.soft ? "SOFT" : "-",
            duration: current?.duration ?? null,
            dispelType: config.dispelType,
            piercesImmunity:
              config.piercesImmunity === null
                ? "UNKNOWN"
                : config.piercesImmunity
                  ? "YES"
                  : "NO",
            updatedAt: config.updatedAt,
          };
        })
        .sort(
          (left, right) =>
            left.heroName.localeCompare(right.heroName) ||
            left.abilityName.localeCompare(right.abilityName),
        ),
    };
  }

  private async heroName(heroId: number): Promise<string> {
    const hero = await this.prisma.hero.findUnique({
      where: { id: heroId },
      select: { localizedName: true },
    });
    return hero?.localizedName ?? "";
  }

  async updateCcAbility(
    abilityId: number,
    input: { dispelType: string; piercesImmunity: string },
  ) {
    const ability = await this.prisma.ability.findUnique({
      where: { id: abilityId },
      select: { id: true },
    });
    if (!ability) {
      throw new NotFoundException(`Ability ${abilityId} tidak ditemukan.`);
    }
    const data = {
      dispelType: input.dispelType,
      piercesImmunity:
        input.piercesImmunity === "YES"
          ? true
          : input.piercesImmunity === "NO"
            ? false
            : null,
    };
    return this.prisma.ccAbilityConfig.upsert({
      where: { abilityId },
      create: { abilityId, ...data },
      update: data,
    });
  }

  async bulkCcAbilities(
    rows: Array<{
      abilityId: number;
      dispelType: string;
      piercesImmunity: string;
    }>,
  ) {
    for (const row of rows) {
      await this.updateCcAbility(row.abilityId, row);
    }
    return { updated: rows.length };
  }

  private assertAllowed(ip: string): void {
    const entry = this.attempts.get(ip);
    if (!entry) return;
    if (Date.now() >= entry.resetAt) {
      this.attempts.delete(ip);
      return;
    }
    if (entry.count >= MAX_ATTEMPTS) {
      throw new HttpException(
        "Terlalu banyak percobaan login. Coba lagi setelah 15 menit.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordFailure(ip: string): void {
    const entry = this.attempts.get(ip);
    if (!entry || Date.now() >= entry.resetAt) {
      this.attempts.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
      return;
    }
    entry.count += 1;
  }
}
