-- CreateTable
CREATE TABLE "ThreadState" (
    "tripId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "resolvedById" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreadState_pkey" PRIMARY KEY ("tripId","itemId")
);

-- AddForeignKey
ALTER TABLE "ThreadState" ADD CONSTRAINT "ThreadState_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

