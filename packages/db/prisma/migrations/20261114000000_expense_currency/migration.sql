ALTER TABLE "Expense" ADD COLUMN "originalCurrency" TEXT,
ADD COLUMN "originalAmountMinor" INTEGER,
ADD COLUMN "rate" DECIMAL(20,10),
ADD COLUMN "rateDate" DATE,
ADD COLUMN "rateManual" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ExpenseSplit" ADD COLUMN "originalAmountMinor" INTEGER;
