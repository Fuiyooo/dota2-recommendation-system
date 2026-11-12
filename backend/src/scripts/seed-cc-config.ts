import { PrismaClient } from "@prisma/client";
import {
  CC_MAIN_METADATA,
  CC_MAIN_OVERRIDES,
} from "../characteristics/crowd-control/cc-main-config";

const prisma = new PrismaClient();

type DispelType = "STRONG" | "BASIC" | "UNDISPELLABLE" | "UNKNOWN";

function dispelTypeOf(dispellable: unknown): DispelType {
  if (dispellable === 1) return "STRONG";
  if (dispellable === 2) return "BASIC";
  if (dispellable === 3) return "UNDISPELLABLE";
  return "UNKNOWN";
}

function piercesOf(immunity: unknown): boolean | null {
  if (immunity === 3) return true;
  if (immunity === 4) return false;
  return null;
}

async function main(): Promise<void> {
  const force = process.env.FORCE_CC_CONFIG === "1";
  const run = await prisma.calculationRun.findFirst({
    where: { status: "SUCCESS" },
    orderBy: { startedAt: "desc" },
  });

  if (!run) {
    throw new Error("Belum ada calculation run. Jalankan calculate dulu.");
  }

  const indicators = await prisma.heroIndicator.findMany({
    where: { runId: run.id, indicator: "disableDuration" },
  });

  let created = 0;
  let skipped = 0;
  let missing = 0;
  const processed = new Set<number>();

  const displayNameToKey = new Map<string, string>();
  for (const [key, override] of Object.entries(CC_MAIN_OVERRIDES)) {
    if (override.displayName) {
      displayNameToKey.set(override.displayName, key);
    }
  }

  for (const indicator of indicators) {
    const detail = (indicator.detail ?? {}) as {
      abilities?: Array<{ ability?: string; hard?: boolean; soft?: boolean }>;
    };

    for (const item of detail.abilities ?? []) {
      if (!item.ability) continue;
      const mappedKey = displayNameToKey.get(item.ability);
      const ability = await prisma.ability.findFirst({
        where: {
          heroId: indicator.heroId,
          abilityType: { not: "Talent" },
          ...(mappedKey
            ? { abilityKey: mappedKey }
            : { displayName: item.ability }),
        },
        select: { id: true, abilityKey: true, rawData: true },
      });
      if (!ability) {
        missing += 1;
        continue;
      }

      const existing = await prisma.ccAbilityConfig.findUnique({
        where: { abilityId: ability.id },
      });
      if (existing && !force) {
        skipped += 1;
        continue;
      }

      const raw = (ability.rawData ?? {}) as Record<string, unknown>;
      const meta = CC_MAIN_METADATA[ability.abilityKey];
      const override = CC_MAIN_OVERRIDES[ability.abilityKey];
      const dispelType =
        override?.dispelType ??
        (meta?.cannotBeDispelled
          ? "UNDISPELLABLE"
          : dispelTypeOf(raw.dispellable));
      const piercesImmunity =
        override?.piercesImmunity !== undefined
          ? override.piercesImmunity
          : meta?.piercesImmunity !== undefined
            ? meta.piercesImmunity
            : piercesOf(raw.immunity);

      processed.add(ability.id);
      const data = { dispelType, piercesImmunity };
      if (existing) {
        await prisma.ccAbilityConfig.update({
          where: { abilityId: ability.id },
          data,
        });
      } else {
        await prisma.ccAbilityConfig.create({
          data: { abilityId: ability.id, ...data },
        });
      }
      created += 1;
    }
  }

  let deleted = 0;
  if (processed.size > 0) {
    const result = await prisma.ccAbilityConfig.deleteMany({
      where: { abilityId: { notIn: [...processed] } },
    });
    deleted = result.count;
  }

  console.log(
    JSON.stringify(
      { runId: run.id, created, skipped, missing, deleted },
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
