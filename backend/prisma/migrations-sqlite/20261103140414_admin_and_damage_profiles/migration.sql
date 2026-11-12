-- CreateTable
CREATE TABLE "HeroDamageProfile" (
    "heroId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "main" TEXT NOT NULL,
    "secondary" TEXT NOT NULL DEFAULT 'NONE',
    "notes" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HeroDamageProfile_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");
