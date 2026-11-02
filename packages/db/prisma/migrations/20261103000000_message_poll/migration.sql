-- DropIndex
DROP INDEX "Message_tripId_createdAt_idx";

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "pollId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Message_pollId_key" ON "Message"("pollId");

-- CreateIndex
CREATE INDEX "Message_tripId_itemId_createdAt_idx" ON "Message"("tripId", "itemId", "createdAt");

-- CreateIndex
CREATE INDEX "Poll_tripId_idx" ON "Poll"("tripId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

