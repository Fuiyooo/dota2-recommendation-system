-- CreateTable
CREATE TABLE "Hero" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "localizedName" TEXT NOT NULL,
    "primaryAttr" TEXT NOT NULL,
    "attackType" TEXT NOT NULL,
    "roles" JSONB NOT NULL,
    "baseStr" REAL NOT NULL,
    "baseAgi" REAL NOT NULL,
    "baseInt" REAL NOT NULL,
    "strGain" REAL NOT NULL,
    "agiGain" REAL NOT NULL,
    "intGain" REAL NOT NULL,
    "complexity" INTEGER,
    "attackRange" INTEGER,
    "moveSpeed" INTEGER,
    "armor" REAL,
    "rawConstants" JSONB NOT NULL,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Ability" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "valveId" INTEGER,
    "abilityKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "heroId" INTEGER NOT NULL,
    "abilityType" TEXT NOT NULL,
    "isInnate" BOOLEAN NOT NULL DEFAULT false,
    "hasScepter" BOOLEAN NOT NULL DEFAULT false,
    "hasShard" BOOLEAN NOT NULL DEFAULT false,
    "maxLevel" INTEGER NOT NULL DEFAULT 1,
    "damageType" TEXT,
    "talentTier" INTEGER,
    "talentLevel" INTEGER,
    "linkedAbilityKey" TEXT,
    "specialValues" JSONB,
    "rawData" JSONB NOT NULL,
    "validationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ability_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MetaSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patch" TEXT NOT NULL,
    "bracket" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "timeWindow" TEXT NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawData" JSONB
);

-- CreateTable
CREATE TABLE "HeroMetaStats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "snapshotId" INTEGER NOT NULL,
    "heroId" INTEGER NOT NULL,
    "position" INTEGER,
    "scope" TEXT NOT NULL DEFAULT 'position',
    "pickCount" INTEGER NOT NULL DEFAULT 0,
    "winCount" INTEGER NOT NULL DEFAULT 0,
    "pickRate" REAL,
    "winRate" REAL,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "bracket" TEXT NOT NULL,
    "timeWindow" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "rawStats" JSONB NOT NULL,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HeroMetaStats_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "MetaSnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HeroMetaStats_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sourceName" TEXT NOT NULL,
    "gameVersion" TEXT NOT NULL,
    "sourceRevision" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validationStatus" TEXT NOT NULL,
    "notes" TEXT,
    "rawPath" TEXT
);

-- CreateTable
CREATE TABLE "PatchChange" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patch" TEXT NOT NULL,
    "heroId" INTEGER,
    "abilityId" INTEGER,
    "kind" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "valveValue" JSONB,
    "externalValue" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PatchChange_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PatchChange_abilityId_fkey" FOREIGN KEY ("abilityId") REFERENCES "Ability" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "heroCount" INTEGER NOT NULL DEFAULT 0,
    "abilityCount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "Hero_name_key" ON "Hero"("name");

-- CreateIndex
CREATE INDEX "Ability_valveId_idx" ON "Ability"("valveId");

-- CreateIndex
CREATE INDEX "Ability_abilityType_idx" ON "Ability"("abilityType");

-- CreateIndex
CREATE UNIQUE INDEX "Ability_heroId_abilityKey_key" ON "Ability"("heroId", "abilityKey");

-- CreateIndex
CREATE UNIQUE INDEX "MetaSnapshot_patch_bracket_week_source_key" ON "MetaSnapshot"("patch", "bracket", "week", "source");

-- CreateIndex
CREATE INDEX "HeroMetaStats_heroId_idx" ON "HeroMetaStats"("heroId");

-- CreateIndex
CREATE UNIQUE INDEX "HeroMetaStats_snapshotId_heroId_position_key" ON "HeroMetaStats"("snapshotId", "heroId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "DataSource_sourceName_gameVersion_sourceRevision_key" ON "DataSource"("sourceName", "gameVersion", "sourceRevision");

-- CreateIndex
CREATE INDEX "PatchChange_patch_heroId_idx" ON "PatchChange"("patch", "heroId");
