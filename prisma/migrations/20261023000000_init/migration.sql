-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('MANAGER', 'MEMBER');

-- CreateEnum
CREATE TYPE "CelebrationType" AS ENUM ('ENGAGEMENT', 'WEDDING', 'SHEVA_BRACHOT', 'BRIT_MILAH', 'PIDYON_HABEN', 'KIDDUSH', 'UPSHERIN', 'BAR_MITZVAH', 'BAT_MITZVAH', 'SIYUM', 'CHANUKAT_BAYIT', 'OTHER');

-- CreateEnum
CREATE TYPE "HebrewMonth" AS ENUM ('TISHREI', 'CHESHVAN', 'KISLEV', 'TEVET', 'SHEVAT', 'ADAR', 'ADAR_I', 'ADAR_II', 'NISAN', 'IYAR', 'SIVAN', 'TAMMUZ', 'AV', 'ELUL');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "fullName" VARCHAR(60) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailReminders" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "joinCode" VARCHAR(8) NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "userId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("userId","groupId")
);

-- CreateTable
CREATE TABLE "Celebration" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "type" "CelebrationType" NOT NULL,
    "eventDate" DATE NOT NULL,
    "eventTime" VARCHAR(5) NOT NULL,
    "hebrewDay" SMALLINT NOT NULL,
    "hebrewMonth" "HebrewMonth" NOT NULL,
    "hebrewYear" SMALLINT NOT NULL,
    "venueName" VARCHAR(100) NOT NULL,
    "address" VARCHAR(200),
    "description" VARCHAR(1000),
    "ownerId" INTEGER NOT NULL,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Celebration_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Celebration_hebrewDay_check" CHECK ("hebrewDay" BETWEEN 1 AND 30),
    CONSTRAINT "Celebration_eventTime_check" CHECK ("eventTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);

-- CreateTable
CREATE TABLE "CelebrationGroup" (
    "celebrationId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CelebrationGroup_pkey" PRIMARY KEY ("celebrationId","groupId")
);

-- CreateTable
CREATE TABLE "CelebrationImage" (
    "celebrationId" INTEGER NOT NULL,
    "imageKey" VARCHAR(64) NOT NULL,
    "mimeType" VARCHAR(20) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CelebrationImage_pkey" PRIMARY KEY ("celebrationId"),
    CONSTRAINT "CelebrationImage_sizeBytes_check" CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 2097152)
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Group_joinCode_key" ON "Group"("joinCode");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_idx" ON "GroupMember"("groupId");

-- CreateIndex
CREATE INDEX "Celebration_eventDate_idx" ON "Celebration"("eventDate");

-- CreateIndex
CREATE INDEX "Celebration_hebrewYear_hebrewMonth_idx" ON "Celebration"("hebrewYear", "hebrewMonth");

-- CreateIndex
CREATE INDEX "Celebration_type_idx" ON "Celebration"("type");

-- CreateIndex
CREATE INDEX "Celebration_ownerId_idx" ON "Celebration"("ownerId");

-- CreateIndex
CREATE INDEX "CelebrationGroup_groupId_idx" ON "CelebrationGroup"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "CelebrationImage_imageKey_key" ON "CelebrationImage"("imageKey");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Celebration" ADD CONSTRAINT "Celebration_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CelebrationGroup" ADD CONSTRAINT "CelebrationGroup_celebrationId_fkey" FOREIGN KEY ("celebrationId") REFERENCES "Celebration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CelebrationGroup" ADD CONSTRAINT "CelebrationGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CelebrationImage" ADD CONSTRAINT "CelebrationImage_celebrationId_fkey" FOREIGN KEY ("celebrationId") REFERENCES "Celebration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
