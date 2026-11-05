-- Photos now come from Unsplash: the page link column is source-neutral.
ALTER TABLE "DestinationPhoto" RENAME COLUMN "pexelsUrl" TO "sourceUrl";
