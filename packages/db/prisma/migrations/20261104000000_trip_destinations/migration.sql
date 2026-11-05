-- CreateTable
CREATE TABLE "TripDestination" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "placeId" TEXT,

    CONSTRAINT "TripDestination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TripDestination_tripId_order_key" ON "TripDestination"("tripId", "order");

-- AddForeignKey
ALTER TABLE "TripDestination" ADD CONSTRAINT "TripDestination_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDestination" ADD CONSTRAINT "TripDestination_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Each old destination string becomes one free-text chip.
INSERT INTO "TripDestination" ("id", "tripId", "order", "name")
SELECT 'dest_' || "id", "id", 0, left(btrim("destination"), 160)
FROM "Trip"
WHERE "destination" IS NOT NULL AND btrim("destination") <> '';

-- AlterTable
ALTER TABLE "Trip" DROP COLUMN "destination";
