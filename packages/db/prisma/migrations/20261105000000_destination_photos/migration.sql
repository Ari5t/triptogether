-- CreateTable
CREATE TABLE "DestinationPhoto" (
    "query" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "photographer" TEXT NOT NULL,
    "photographerUrl" TEXT NOT NULL,
    "pexelsUrl" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DestinationPhoto_pkey" PRIMARY KEY ("query","rank")
);

-- AlterTable
ALTER TABLE "Trip" DROP COLUMN "coverUrl";
