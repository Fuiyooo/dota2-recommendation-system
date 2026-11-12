-- CreateTable
CREATE TABLE "CcEffect" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "abilityKey" TEXT NOT NULL,
    "effectName" TEXT NOT NULL,
    "controlType" TEXT NOT NULL,
    "durationField" TEXT,
    "durationFixed" REAL,
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

-- CreateIndex
CREATE INDEX "CcEffect_abilityKey_idx" ON "CcEffect"("abilityKey");

-- CreateIndex
CREATE INDEX "CcEffect_verified_idx" ON "CcEffect"("verified");

-- CreateIndex
CREATE UNIQUE INDEX "CcEffect_abilityKey_effectName_upgradeType_key" ON "CcEffect"("abilityKey", "effectName", "upgradeType");
