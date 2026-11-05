-- Cover images now come from Wikipedia, one per destination name.
DROP TABLE "DestinationPhoto";

CREATE TABLE "DestinationImage" (
    "query" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DestinationImage_pkey" PRIMARY KEY ("query")
);
