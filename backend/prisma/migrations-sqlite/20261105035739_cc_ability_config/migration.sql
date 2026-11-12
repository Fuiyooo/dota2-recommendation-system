-- CreateTable
CREATE TABLE "CcAbilityConfig" (
    "abilityId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dispelType" TEXT NOT NULL,
    "piercesImmunity" BOOLEAN,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CcAbilityConfig_abilityId_fkey" FOREIGN KEY ("abilityId") REFERENCES "Ability" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
