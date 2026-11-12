import { PrismaClient } from "@prisma/client";
import { DEFAULT_DAMAGE_PROFILE } from "../damage-profile/damage-profile.types";

const prisma = new PrismaClient();

type DamageType = "PHYSICAL" | "MAGICAL" | "PURE";

const INDICATOR: Record<DamageType, string> = {
  PHYSICAL: "physicalDamage",
  MAGICAL: "magicDamage",
  PURE: "pureDamage",
};

async function main(): Promise<void> {
  const run = await prisma.calculationRun.findFirst({
    where: { status: "SUCCESS" },
    orderBy: { startedAt: "desc" },
  });

  const heroes = await prisma.hero.findMany({
    select: { id: true, localizedName: true, roles: true },
    orderBy: { localizedName: "asc" },
  });

  const existing = new Set(
    (await prisma.heroDamageProfile.findMany({ select: { heroId: true } })).map(
      (row) => row.heroId,
    ),
  );

  const details = new Map<number, Record<string, unknown>>();
  if (run) {
    const indicators = await prisma.heroIndicator.findMany({
      where: { runId: run.id, characteristic: "damage" },
    });
    for (const indicator of indicators) {
      if (indicator.detail && typeof indicator.detail === "object") {
        details.set(
          indicator.heroId,
          indicator.detail as Record<string, unknown>,
        );
      }
    }
  }

  let created = 0;
  let skipped = 0;

  for (const hero of heroes) {
    if (existing.has(hero.id)) {
      skipped += 1;
      continue;
    }

    const totals: Record<DamageType, number> = {
      PHYSICAL: 0,
      MAGICAL: 0,
      PURE: 0,
    };
    const detail = details.get(hero.id);
    const abilities = Array.isArray(detail?.abilities)
      ? (detail.abilities as Array<Record<string, unknown>>)
      : [];
    for (const ability of abilities) {
      if (ability.excluded) continue;
      const type = String(ability.type ?? "").toUpperCase();
      const value = Number(ability.value ?? 0);
      if (type in totals && Number.isFinite(value)) {
        totals[type as DamageType] += value;
      }
    }

    const ranked = (Object.keys(totals) as DamageType[])
      .filter((type) => totals[type] > 0)
      .sort((left, right) => totals[right] - totals[left]);

    let main: DamageType = DEFAULT_DAMAGE_PROFILE.main;
    let secondary = DEFAULT_DAMAGE_PROFILE.secondary;
    if (ranked.length > 0) {
      main = ranked[0];
      secondary = ranked[1] ?? "NONE";
    }

    await prisma.heroDamageProfile.create({
      data: {
        heroId: hero.id,
        main,
        secondary,
        notes: run
          ? `Saran awal dari run ${run.id}, perlu ditinjau manual.`
          : "Saran awal dari role hero, perlu ditinjau manual.",
      },
    });
    created += 1;
  }

  console.log(
    JSON.stringify(
      { runId: run?.id ?? null, created, skipped, total: heroes.length },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
