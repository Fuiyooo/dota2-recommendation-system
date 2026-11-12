-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CcEffect" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "abilityKey" TEXT NOT NULL,
    "effectName" TEXT NOT NULL,
    "controlType" TEXT NOT NULL,
    "durationField" TEXT,
    "durationFixed" REAL,
    "instances" INTEGER NOT NULL DEFAULT 1,
    "scepterMode" TEXT,
    "shardMode" TEXT,
    "requiresScepter" BOOLEAN NOT NULL DEFAULT false,
    "requiresShard" BOOLEAN NOT NULL DEFAULT false,
    "dispelType" TEXT NOT NULL,
    "debuffImmunity" TEXT NOT NULL,
    "isConditional" BOOLEAN NOT NULL DEFAULT false,
    "conditionDescription" TEXT,
    "conditionSupported" BOOLEAN NOT NULL DEFAULT true,
    "startOffset" REAL NOT NULL DEFAULT 0,
    "upgradeType" TEXT NOT NULL DEFAULT 'BASE',
    "confidence" TEXT NOT NULL DEFAULT 'VERIFIED',
    "sourceNote" TEXT,
    "notes" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CcEffect" ("abilityKey", "conditionDescription", "conditionSupported", "confidence", "controlType", "createdAt", "debuffImmunity", "dispelType", "durationField", "durationFixed", "effectName", "id", "isConditional", "notes", "requiresScepter", "requiresShard", "scepterMode", "shardMode", "sourceNote", "startOffset", "updatedAt", "upgradeType", "verified") SELECT "abilityKey", "conditionDescription", "conditionSupported", "confidence", "controlType", "createdAt", "debuffImmunity", "dispelType", "durationField", "durationFixed", "effectName", "id", "isConditional", "notes", "requiresScepter", "requiresShard", "scepterMode", "shardMode", "sourceNote", "startOffset", "updatedAt", "upgradeType", "verified" FROM "CcEffect";
DROP TABLE "CcEffect";
ALTER TABLE "new_CcEffect" RENAME TO "CcEffect";
CREATE INDEX "CcEffect_abilityKey_idx" ON "CcEffect"("abilityKey");
CREATE INDEX "CcEffect_verified_idx" ON "CcEffect"("verified");
CREATE UNIQUE INDEX "CcEffect_abilityKey_effectName_upgradeType_key" ON "CcEffect"("abilityKey", "effectName", "upgradeType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
