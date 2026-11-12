import { PrismaClient } from "@prisma/client";

const BATCH_SIZE = 1000;

const sourceUrl = process.env.SOURCE_DATABASE_URL ?? process.env.DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL;

if (!sourceUrl) {
  throw new Error("SOURCE_DATABASE_URL (atau DATABASE_URL) belum diisi");
}
if (!targetUrl) {
  throw new Error("TARGET_DATABASE_URL belum diisi");
}
if (sourceUrl === targetUrl) {
  throw new Error("Sumber dan target menunjuk database yang sama");
}

interface TableSpec {
  model: string;
  table: string;
  orderBy: string;
}

// Urutan mengikuti dependency foreign key: parent sebelum child.
const TABLES: TableSpec[] = [
  { model: "hero", table: "Hero", orderBy: "id" },
  { model: "heroDamageProfile", table: "HeroDamageProfile", orderBy: "heroId" },
  { model: "adminUser", table: "AdminUser", orderBy: "id" },
  { model: "ability", table: "Ability", orderBy: "id" },
  { model: "metaSnapshot", table: "MetaSnapshot", orderBy: "id" },
  { model: "heroMetaStats", table: "HeroMetaStats", orderBy: "id" },
  { model: "dataSource", table: "DataSource", orderBy: "id" },
  { model: "patchChange", table: "PatchChange", orderBy: "id" },
  { model: "syncRun", table: "SyncRun", orderBy: "id" },
  { model: "ccEffect", table: "CcEffect", orderBy: "id" },
  { model: "calculationRun", table: "CalculationRun", orderBy: "id" },
  { model: "heroIndicator", table: "HeroIndicator", orderBy: "id" },
  { model: "indicatorScore", table: "IndicatorScore", orderBy: "id" },
  { model: "characteristicScore", table: "CharacteristicScore", orderBy: "id" },
  { model: "sawRun", table: "SawRun", orderBy: "id" },
  { model: "sawResult", table: "SawResult", orderBy: "id" },
  { model: "ccAbilityConfig", table: "CcAbilityConfig", orderBy: "abilityId" },
];

const SERIAL_TABLES = TABLES.filter(
  (spec) => spec.model !== "hero" && spec.model !== "heroDamageProfile" && spec.model !== "ccAbilityConfig",
).map((spec) => spec.table);

type Delegate = {
  count: () => Promise<number>;
  findMany: (args: unknown) => Promise<unknown[]>;
  createMany: (args: unknown) => Promise<{ count: number }>;
};

const source = new PrismaClient({ datasourceUrl: sourceUrl });
const target = new PrismaClient({ datasourceUrl: targetUrl });

function delegate(client: PrismaClient, model: string): Delegate {
  return (client as unknown as Record<string, Delegate>)[model];
}

function mask(url: string): string {
  return url
    .replace(/:\/\/[^:]+:[^@]+@/, "://***@")
    .replace(/\?.*$/, "");
}

async function copyTable(spec: TableSpec): Promise<{ sourceCount: number; targetCount: number }> {
  const from = delegate(source, spec.model);
  const to = delegate(target, spec.model);

  const sourceCount = await from.count();
  let sent = 0;

  for (let skip = 0; skip < sourceCount; skip += BATCH_SIZE) {
    const rows = await from.findMany({
      skip,
      take: BATCH_SIZE,
      orderBy: { [spec.orderBy]: "asc" },
    });
    if (rows.length === 0) break;

    await to.createMany({ data: rows, skipDuplicates: true });
    sent += rows.length;
    process.stdout.write(`\r${spec.table.padEnd(22)} ${sent}/${sourceCount}`);
  }

  const targetCount = await to.count();
  process.stdout.write(`\r${spec.table.padEnd(22)} ${targetCount}/${sourceCount}\n`);
  return { sourceCount, targetCount };
}

async function truncateTarget(): Promise<void> {
  const list = TABLES.map((spec) => `"${spec.table}"`).join(", ");

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      // SET LOCAL + TRUNCATE dalam satu transaksi agar lock_timeout berlaku
      // pada koneksi yang sama dan tidak menggantung selamanya.
      await target.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '15s'");
        await tx.$executeRawUnsafe(`TRUNCATE TABLE ${list}`);
      });
      return;
    } catch (error) {
      if (attempt === 5) throw error;
      console.log(`Lock tabel sedang dipakai (percobaan ${attempt}), mencoba lagi...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

async function resetSequences(): Promise<void> {
  for (const table of SERIAL_TABLES) {
    await target.$queryRawUnsafe(
      `SELECT setval(
         pg_get_serial_sequence('"${table}"', 'id'),
         (SELECT MAX(id) FROM "${table}")
       )
       WHERE (SELECT MAX(id) FROM "${table}") IS NOT NULL`,
    );
  }
}

async function main(): Promise<void> {
  console.log(`Sumber : ${mask(sourceUrl!)}`);
  console.log(`Target : ${mask(targetUrl!)}\n`);

  console.log("Mengosongkan tabel target...");
  await truncateTarget();
  console.log("Selesai.\n");

  console.log("Menyalin data:");
  const mismatches: string[] = [];
  const extras: string[] = [];
  for (const spec of TABLES) {
    const { sourceCount, targetCount } = await copyTable(spec);
    if (targetCount < sourceCount) {
      mismatches.push(`${spec.table}: ${targetCount}/${sourceCount}`);
    } else if (targetCount > sourceCount) {
      extras.push(`${spec.table}: +${targetCount - sourceCount} baris baru saat sync`);
    }
  }

  await resetSequences();
  console.log("\nSequence id sudah disetel ulang.");

  if (extras.length > 0) {
    console.log(`\nCatatan (kemungkinan dari request yang masuk saat sync):\n${extras.join("\n")}`);
  }

  if (mismatches.length > 0) {
    console.error(`\nJumlah baris tidak cocok:\n${mismatches.join("\n")}`);
    process.exitCode = 1;
    return;
  }

  console.log("Selesai. Semua tabel tersalin dengan jumlah yang sama.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await source.$disconnect();
    await target.$disconnect();
  });
