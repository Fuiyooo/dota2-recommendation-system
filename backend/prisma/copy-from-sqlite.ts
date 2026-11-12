import { PrismaClient as PostgresClient } from "@prisma/client";
import { PrismaClient as SqliteClient } from "../src/generated/sqlite-client";

const BATCH_SIZE = 1000;

const sqlite = new SqliteClient();

// Arahkan ke Supabase tanpa mengubah .env:
//   SEED_DATABASE_URL="postgresql://...:5432/postgres?sslmode=require" npm run copy:data
const targetUrl = process.env.SEED_DATABASE_URL ?? process.env.DATABASE_URL;
const postgres = new PostgresClient(
  targetUrl ? { datasourceUrl: targetUrl } : undefined,
);

interface TableOrder {
  model: string;
  orderBy: string;
}

// Urutan mengikuti dependency foreign key: parent sebelum child.
const TABLES: TableOrder[] = [
  { model: "hero", orderBy: "id" },
  { model: "heroDamageProfile", orderBy: "heroId" },
  { model: "adminUser", orderBy: "id" },
  { model: "ability", orderBy: "id" },
  { model: "metaSnapshot", orderBy: "id" },
  { model: "heroMetaStats", orderBy: "id" },
  { model: "dataSource", orderBy: "id" },
  { model: "patchChange", orderBy: "id" },
  { model: "syncRun", orderBy: "id" },
  { model: "ccEffect", orderBy: "id" },
  { model: "calculationRun", orderBy: "id" },
  { model: "heroIndicator", orderBy: "id" },
  { model: "indicatorScore", orderBy: "id" },
  { model: "characteristicScore", orderBy: "id" },
  { model: "sawRun", orderBy: "id" },
  { model: "sawResult", orderBy: "id" },
  { model: "ccAbilityConfig", orderBy: "abilityId" },
];

// Hanya tabel dengan kolom id autoincrement. Hero.id diisi manual dari data Valve.
const SERIAL_TABLES = [
  "AdminUser",
  "Ability",
  "MetaSnapshot",
  "HeroMetaStats",
  "DataSource",
  "PatchChange",
  "SyncRun",
  "CcEffect",
  "CalculationRun",
  "HeroIndicator",
  "IndicatorScore",
  "CharacteristicScore",
  "SawRun",
  "SawResult",
];

type Delegate = {
  count: () => Promise<number>;
  findMany: (args: unknown) => Promise<unknown[]>;
  createMany: (args: unknown) => Promise<{ count: number }>;
};

function delegate(client: unknown, model: string): Delegate {
  return (client as Record<string, Delegate>)[model];
}

async function copyTable({ model, orderBy }: TableOrder): Promise<{ targetCount: number; total: number }> {
  const source = delegate(sqlite, model);
  const target = delegate(postgres, model);

  const total = await source.count();
  let sent = 0;

  for (let skip = 0; skip < total; skip += BATCH_SIZE) {
    const rows = await source.findMany({
      skip,
      take: BATCH_SIZE,
      orderBy: { [orderBy]: "asc" },
    });
    if (rows.length === 0) break;

    await target.createMany({ data: rows, skipDuplicates: true });
    sent += rows.length;
    process.stdout.write(`\r${model.padEnd(22)} ${sent}/${total}`);
  }

  const targetCount = await target.count();
  process.stdout.write(`\r${model.padEnd(22)} ${targetCount}/${total}\n`);
  return { targetCount, total };
}

async function resetSequences(): Promise<void> {
  for (const table of SERIAL_TABLES) {
    await postgres.$queryRawUnsafe(
      `SELECT setval(
         pg_get_serial_sequence('"${table}"', 'id'),
         (SELECT MAX(id) FROM "${table}")
       )
       WHERE (SELECT MAX(id) FROM "${table}") IS NOT NULL`,
    );
  }
}

async function main(): Promise<void> {
  const requested = process.argv.slice(2);
  const tables =
    requested.length > 0
      ? TABLES.filter((t) => requested.includes(t.model))
      : TABLES;

  if (tables.length === 0) {
    console.error(`Nama tabel tidak dikenal. Pilihan: ${TABLES.map((t) => t.model).join(", ")}`);
    process.exit(1);
  }

  console.log(`Menyalin ${tables.length} tabel dari prisma/dev.db ke Postgres\n`);

  const mismatches: string[] = [];
  for (const table of tables) {
    const { targetCount, total } = await copyTable(table);
    if (targetCount !== total) {
      mismatches.push(`${table.model}: ${targetCount}/${total}`);
    }
  }

  if (requested.length === 0) {
    await resetSequences();
    console.log("\nSequence id sudah disetel ulang.");
  }

  if (mismatches.length > 0) {
    console.error(`\nJumlah baris tidak cocok:\n${mismatches.join("\n")}`);
    process.exit(1);
  }

  console.log("Selesai. Semua baris tersalin.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await sqlite.$disconnect();
    await postgres.$disconnect();
  });
