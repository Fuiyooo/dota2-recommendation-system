-- AlterTable
ALTER TABLE "Hero" ADD COLUMN "attackPoint" REAL;
ALTER TABLE "Hero" ADD COLUMN "attackRate" REAL;
ALTER TABLE "Hero" ADD COLUMN "baseHealth" REAL;
ALTER TABLE "Hero" ADD COLUMN "baseMagicResistance" REAL;
ALTER TABLE "Hero" ADD COLUMN "baseMana" REAL;
ALTER TABLE "Hero" ADD COLUMN "damageMax" REAL;
ALTER TABLE "Hero" ADD COLUMN "damageMin" REAL;

-- CreateTable
CREATE TABLE "CalculationRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patch" TEXT NOT NULL,
    "configVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "heroCount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT
);

-- CreateTable
CREATE TABLE "HeroIndicator" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "runId" INTEGER NOT NULL,
    "heroId" INTEGER NOT NULL,
    "characteristic" TEXT NOT NULL,
    "indicator" TEXT NOT NULL,
    "rawValue" REAL,
    "unit" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HeroIndicator_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CalculationRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HeroIndicator_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IndicatorScore" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "runId" INTEGER NOT NULL,
    "heroId" INTEGER NOT NULL,
    "indicator" TEXT NOT NULL,
    "characteristic" TEXT NOT NULL,
    "rawValue" REAL,
    "percentile" REAL,
    "score" INTEGER,
    "populationSize" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IndicatorScore_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CalculationRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IndicatorScore_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CharacteristicScore" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "runId" INTEGER NOT NULL,
    "heroId" INTEGER NOT NULL,
    "characteristic" TEXT NOT NULL,
    "score" REAL,
    "status" TEXT NOT NULL,
    "weights" JSONB NOT NULL,
    "indicators" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CharacteristicScore_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CalculationRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CharacteristicScore_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SawRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "runId" INTEGER NOT NULL,
    "weights" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SawRun_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CalculationRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SawResult" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sawRunId" INTEGER NOT NULL,
    "heroId" INTEGER NOT NULL,
    "normalizedScores" JSONB NOT NULL,
    "finalScore" REAL NOT NULL,
    "rank" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SawResult_sawRunId_fkey" FOREIGN KEY ("sawRunId") REFERENCES "SawRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SawResult_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "HeroIndicator_heroId_idx" ON "HeroIndicator"("heroId");

-- CreateIndex
CREATE UNIQUE INDEX "HeroIndicator_runId_heroId_indicator_key" ON "HeroIndicator"("runId", "heroId", "indicator");

-- CreateIndex
CREATE INDEX "IndicatorScore_heroId_idx" ON "IndicatorScore"("heroId");

-- CreateIndex
CREATE UNIQUE INDEX "IndicatorScore_runId_heroId_indicator_key" ON "IndicatorScore"("runId", "heroId", "indicator");

-- CreateIndex
CREATE INDEX "CharacteristicScore_heroId_idx" ON "CharacteristicScore"("heroId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacteristicScore_runId_heroId_characteristic_key" ON "CharacteristicScore"("runId", "heroId", "characteristic");

-- CreateIndex
CREATE INDEX "SawResult_heroId_idx" ON "SawResult"("heroId");

-- CreateIndex
CREATE UNIQUE INDEX "SawResult_sawRunId_heroId_key" ON "SawResult"("sawRunId", "heroId");
