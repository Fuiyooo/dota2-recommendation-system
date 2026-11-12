-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Ability" (
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
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "talentTier" INTEGER,
    "talentLevel" INTEGER,
    "linkedAbilityKey" TEXT,
    "specialValues" JSONB,
    "rawData" JSONB NOT NULL,
    "validationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ability_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Ability" ("abilityKey", "abilityType", "damageType", "displayName", "hasScepter", "hasShard", "heroId", "id", "isInnate", "linkedAbilityKey", "maxLevel", "rawData", "specialValues", "syncedAt", "talentLevel", "talentTier", "validationStatus", "valveId") SELECT "abilityKey", "abilityType", "damageType", "displayName", "hasScepter", "hasShard", "heroId", "id", "isInnate", "linkedAbilityKey", "maxLevel", "rawData", "specialValues", "syncedAt", "talentLevel", "talentTier", "validationStatus", "valveId" FROM "Ability";
DROP TABLE "Ability";
ALTER TABLE "new_Ability" RENAME TO "Ability";
CREATE INDEX "Ability_valveId_idx" ON "Ability"("valveId");
CREATE INDEX "Ability_abilityType_idx" ON "Ability"("abilityType");
CREATE UNIQUE INDEX "Ability_heroId_abilityKey_key" ON "Ability"("heroId", "abilityKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
