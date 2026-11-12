-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Hero" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "localizedName" TEXT NOT NULL,
    "primaryAttr" TEXT NOT NULL,
    "attackType" TEXT NOT NULL,
    "roles" JSONB NOT NULL,
    "baseStr" DOUBLE PRECISION NOT NULL,
    "baseAgi" DOUBLE PRECISION NOT NULL,
    "baseInt" DOUBLE PRECISION NOT NULL,
    "strGain" DOUBLE PRECISION NOT NULL,
    "agiGain" DOUBLE PRECISION NOT NULL,
    "intGain" DOUBLE PRECISION NOT NULL,
    "complexity" INTEGER,
    "attackRange" INTEGER,
    "moveSpeed" INTEGER,
    "armor" DOUBLE PRECISION,
    "damageMin" DOUBLE PRECISION,
    "damageMax" DOUBLE PRECISION,
    "attackRate" DOUBLE PRECISION,
    "attackPoint" DOUBLE PRECISION,
    "baseHealth" DOUBLE PRECISION,
    "baseMana" DOUBLE PRECISION,
    "baseMagicResistance" DOUBLE PRECISION,
    "rawConstants" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroDamageProfile" (
    "heroId" INTEGER NOT NULL,
    "main" TEXT NOT NULL,
    "secondary" TEXT NOT NULL DEFAULT 'NONE',
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroDamageProfile_pkey" PRIMARY KEY ("heroId")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ability" (
    "id" SERIAL NOT NULL,
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
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaSnapshot" (
    "id" SERIAL NOT NULL,
    "patch" TEXT NOT NULL,
    "bracket" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "timeWindow" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawData" JSONB,

    CONSTRAINT "MetaSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroMetaStats" (
    "id" SERIAL NOT NULL,
    "snapshotId" INTEGER NOT NULL,
    "heroId" INTEGER NOT NULL,
    "position" INTEGER,
    "scope" TEXT NOT NULL DEFAULT 'position',
    "pickCount" INTEGER NOT NULL DEFAULT 0,
    "winCount" INTEGER NOT NULL DEFAULT 0,
    "pickRate" DOUBLE PRECISION,
    "winRate" DOUBLE PRECISION,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "bracket" TEXT NOT NULL,
    "timeWindow" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "rawStats" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeroMetaStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" SERIAL NOT NULL,
    "sourceName" TEXT NOT NULL,
    "gameVersion" TEXT NOT NULL,
    "sourceRevision" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validationStatus" TEXT NOT NULL,
    "notes" TEXT,
    "rawPath" TEXT,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatchChange" (
    "id" SERIAL NOT NULL,
    "patch" TEXT NOT NULL,
    "heroId" INTEGER,
    "abilityId" INTEGER,
    "kind" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "valveValue" JSONB,
    "externalValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatchChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "heroCount" INTEGER NOT NULL DEFAULT 0,
    "abilityCount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CcEffect" (
    "id" SERIAL NOT NULL,
    "abilityKey" TEXT NOT NULL,
    "effectName" TEXT NOT NULL,
    "controlType" TEXT NOT NULL,
    "durationField" TEXT,
    "durationFixed" DOUBLE PRECISION,
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
    "startOffset" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "upgradeType" TEXT NOT NULL DEFAULT 'BASE',
    "confidence" TEXT NOT NULL DEFAULT 'VERIFIED',
    "sourceNote" TEXT,
    "notes" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CcEffect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculationRun" (
    "id" SERIAL NOT NULL,
    "patch" TEXT NOT NULL,
    "configVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "heroCount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "CalculationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroIndicator" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "heroId" INTEGER NOT NULL,
    "characteristic" TEXT NOT NULL,
    "indicator" TEXT NOT NULL,
    "rawValue" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeroIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndicatorScore" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "heroId" INTEGER NOT NULL,
    "indicator" TEXT NOT NULL,
    "characteristic" TEXT NOT NULL,
    "rawValue" DOUBLE PRECISION,
    "percentile" DOUBLE PRECISION,
    "score" INTEGER,
    "populationSize" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndicatorScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacteristicScore" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "heroId" INTEGER NOT NULL,
    "characteristic" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "weights" JSONB NOT NULL,
    "indicators" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacteristicScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SawRun" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "weights" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SawRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SawResult" (
    "id" SERIAL NOT NULL,
    "sawRunId" INTEGER NOT NULL,
    "heroId" INTEGER NOT NULL,
    "normalizedScores" JSONB NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "mainPosition" INTEGER,
    "pickRate" DOUBLE PRECISION,
    "pickCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SawResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CcAbilityConfig" (
    "abilityId" INTEGER NOT NULL,
    "dispelType" TEXT NOT NULL,
    "piercesImmunity" BOOLEAN,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CcAbilityConfig_pkey" PRIMARY KEY ("abilityId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hero_name_key" ON "Hero"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

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

-- CreateIndex
CREATE INDEX "CcEffect_abilityKey_idx" ON "CcEffect"("abilityKey");

-- CreateIndex
CREATE INDEX "CcEffect_verified_idx" ON "CcEffect"("verified");

-- CreateIndex
CREATE UNIQUE INDEX "CcEffect_abilityKey_effectName_upgradeType_key" ON "CcEffect"("abilityKey", "effectName", "upgradeType");

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

-- AddForeignKey
ALTER TABLE "HeroDamageProfile" ADD CONSTRAINT "HeroDamageProfile_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ability" ADD CONSTRAINT "Ability_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeroMetaStats" ADD CONSTRAINT "HeroMetaStats_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "MetaSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeroMetaStats" ADD CONSTRAINT "HeroMetaStats_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatchChange" ADD CONSTRAINT "PatchChange_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatchChange" ADD CONSTRAINT "PatchChange_abilityId_fkey" FOREIGN KEY ("abilityId") REFERENCES "Ability"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeroIndicator" ADD CONSTRAINT "HeroIndicator_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CalculationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeroIndicator" ADD CONSTRAINT "HeroIndicator_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicatorScore" ADD CONSTRAINT "IndicatorScore_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CalculationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicatorScore" ADD CONSTRAINT "IndicatorScore_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacteristicScore" ADD CONSTRAINT "CharacteristicScore_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CalculationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacteristicScore" ADD CONSTRAINT "CharacteristicScore_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SawRun" ADD CONSTRAINT "SawRun_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CalculationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SawResult" ADD CONSTRAINT "SawResult_sawRunId_fkey" FOREIGN KEY ("sawRunId") REFERENCES "SawRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SawResult" ADD CONSTRAINT "SawResult_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CcAbilityConfig" ADD CONSTRAINT "CcAbilityConfig_abilityId_fkey" FOREIGN KEY ("abilityId") REFERENCES "Ability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

