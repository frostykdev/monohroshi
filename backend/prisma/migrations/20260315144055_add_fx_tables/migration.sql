-- CreateTable
CREATE TABLE "ExchangeRateSnapshot" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "asOfDate" DATE NOT NULL,
    "provider" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "rate" DECIMAL(19,8) NOT NULL,
    "snapshotId" TEXT NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExchangeRateSnapshot_baseCurrency_asOfDate_idx" ON "ExchangeRateSnapshot"("baseCurrency", "asOfDate");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRateSnapshot_baseCurrency_asOfDate_provider_key" ON "ExchangeRateSnapshot"("baseCurrency", "asOfDate", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_snapshotId_quoteCurrency_key" ON "ExchangeRate"("snapshotId", "quoteCurrency");

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ExchangeRateSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
