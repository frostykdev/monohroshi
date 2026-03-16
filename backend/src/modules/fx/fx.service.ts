import { prisma } from "../../lib/prisma";
import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";
import { env } from "../../config/env";
import { fetchRatesFromProvider, PROVIDER_NAME } from "./fx-provider";

/** Returns midnight UTC Date for a given date string (YYYY-MM-DD). */
const toDateOnly = (dateStr: string): Date => {
  const d = new Date(dateStr + "T00:00:00.000Z");
  if (isNaN(d.getTime())) throw new Error(`Invalid date: ${dateStr}`);
  return d;
};

/** Today as YYYY-MM-DD in UTC. */
export const todayUTC = (): string => new Date().toISOString().slice(0, 10);

/**
 * Idempotently fetch and persist exchange rates for a given base currency and date.
 * If a snapshot already exists for (base, date, provider) it is returned as-is.
 */
export const refreshDailyRates = async (
  base: string,
  dateStr: string,
): Promise<{ snapshotId: string; rateCount: number; cached: boolean }> => {
  const asOfDate = toDateOnly(dateStr);

  const existing = await prisma.exchangeRateSnapshot.findUnique({
    where: {
      baseCurrency_asOfDate_provider: {
        baseCurrency: base,
        asOfDate,
        provider: PROVIDER_NAME,
      },
    },
    select: { id: true, _count: { select: { rates: true } } },
  });

  if (existing) {
    return {
      snapshotId: existing.id,
      rateCount: existing._count.rates,
      cached: true,
    };
  }

  const rateMap = await fetchRatesFromProvider(base, dateStr);

  const snapshot = await prisma.$transaction(async (tx) => {
    const snap = await tx.exchangeRateSnapshot.create({
      data: { baseCurrency: base, asOfDate, provider: PROVIDER_NAME },
    });

    await tx.exchangeRate.createMany({
      data: Object.entries(rateMap).map(([quote, rate]) => ({
        snapshotId: snap.id,
        quoteCurrency: quote,
        rate: String(rate),
      })),
      skipDuplicates: true,
    });

    return snap;
  });

  return {
    snapshotId: snapshot.id,
    rateCount: Object.keys(rateMap).length,
    cached: false,
  };
};

/**
 * Retrieve persisted rates for (base, date).
 * Falls back to the most recent earlier snapshot (weekends/holidays).
 * If no snapshot exists at all for this base, auto-seeds from the provider.
 */
export const getRates = async (
  base: string,
  dateStr: string,
): Promise<Record<string, number>> => {
  const asOfDate = toDateOnly(dateStr);

  let snapshot = await prisma.exchangeRateSnapshot.findFirst({
    where: { baseCurrency: base, asOfDate, provider: PROVIDER_NAME },
    include: { rates: { select: { quoteCurrency: true, rate: true } } },
  });

  if (!snapshot) {
    snapshot = await prisma.exchangeRateSnapshot.findFirst({
      where: {
        baseCurrency: base,
        asOfDate: { lte: asOfDate },
        provider: PROVIDER_NAME,
      },
      orderBy: { asOfDate: "desc" },
      include: { rates: { select: { quoteCurrency: true, rate: true } } },
    });
  }

  // Lazy seed: no rates in DB yet — fetch from provider and persist
  if (!snapshot) {
    await refreshDailyRates(base, dateStr);

    snapshot = await prisma.exchangeRateSnapshot.findFirst({
      where: { baseCurrency: base, provider: PROVIDER_NAME },
      orderBy: { asOfDate: "desc" },
      include: { rates: { select: { quoteCurrency: true, rate: true } } },
    });
  }

  if (!snapshot) {
    throw new ApiError(
      `No exchange rates found for ${base} on ${dateStr}`,
      HTTP_STATUS.notFound,
    );
  }

  const result: Record<string, number> = {};
  for (const r of snapshot.rates) {
    result[r.quoteCurrency] = parseFloat(r.rate.toString());
  }
  return result;
};

/**
 * Convert an amount from one currency to another.
 *
 * Strategy (in order):
 *  1. Direct: fetch rates keyed by `from`, multiply by rate for `to`.
 *  2. Inverted: fetch rates keyed by `to` (e.g. workspace primary currency),
 *     look up `from` in those rates, divide. This is the common case when
 *     the workspace's primary currency snapshot is pre-seeded.
 *  3. Cross-rate: pivot via USD (or FX_PIVOT_BASE).
 *
 * Lazy-seeds rates on first use when no DB snapshot exists.
 */
export const convertAmount = async (
  amount: number,
  from: string,
  to: string,
  dateStr?: string,
): Promise<number> => {
  if (from === to) return amount;

  const date = dateStr ?? todayUTC();

  // 1. Direct: base = from → look up to
  try {
    const rates = await getRates(from, date);
    const rate = rates[to];
    if (rate !== undefined) return amount * rate;
  } catch {
    // Fall through
  }

  // 2. Inverted: base = to → look up from, divide
  //    e.g. snapshot for UAH contains USD=0.024 → to convert X USD: X / 0.024
  try {
    const rates = await getRates(to, date);
    const rate = rates[from];
    if (rate !== undefined && rate !== 0) return amount / rate;
  } catch {
    // Fall through
  }

  // 3. Cross-rate via pivot base (default: USD)
  const pivotBase = env.FX_PIVOT_BASE ?? "USD";
  if (from !== pivotBase && to !== pivotBase) {
    const pivotRates = await getRates(pivotBase, date);
    const toRate = pivotRates[to];
    const fromRate = pivotRates[from];
    if (toRate !== undefined && fromRate !== undefined && fromRate !== 0) {
      return (amount / fromRate) * toRate;
    }
  }

  throw new ApiError(
    `Cannot convert ${from} → ${to}: rates unavailable`,
    HTTP_STATUS.notFound,
  );
};
