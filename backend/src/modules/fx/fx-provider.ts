/**
 * Thin abstraction over external FX data providers.
 *
 * Default provider: ExchangeRate-API v6 (https://www.exchangerate-api.com)
 *   Requires FX_PROVIDER_KEY. Uses /v6/{key}/latest/{base} endpoint.
 *   Response shape: { result: "success", conversion_rates: { USD: 1, UAH: 41.5, ... } }
 *
 * Fallback: Frankfurter (https://api.frankfurter.app) — free, no API key.
 *   Covers ~30 major currencies. Used when FX_PROVIDER_KEY is not set.
 */
import { env } from "../../config/env";

export const PROVIDER_NAME = "exchangerate-api";

export type RateMap = Record<string, number>;

export const fetchRatesFromProvider = async (
  base: string,
  _date: string,
): Promise<RateMap> => {
  const { FX_PROVIDER_KEY } = env;

  if (FX_PROVIDER_KEY) {
    // ExchangeRate-API v6 — latest rates for a base currency
    const url = `https://v6.exchangerate-api.com/v6/${FX_PROVIDER_KEY}/latest/${base}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok)
      throw new Error(
        `ExchangeRate-API returned ${res.status}: ${res.statusText}`,
      );
    const body = (await res.json()) as {
      result?: string;
      conversion_rates?: Record<string, number>;
      "error-type"?: string;
    };
    if (body.result !== "success" || !body.conversion_rates) {
      throw new Error(
        `ExchangeRate-API error: ${body["error-type"] ?? "unknown"}`,
      );
    }
    return body.conversion_rates;
  }

  // Fallback: Frankfurter (free, no key, ~30 major currencies)
  const url = `https://api.frankfurter.app/latest?from=${base}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok)
    throw new Error(`Frankfurter returned ${res.status}: ${res.statusText}`);
  const body = (await res.json()) as {
    rates?: Record<string, number>;
    base?: string;
  };
  if (!body.rates) throw new Error("Frankfurter response missing rates field");

  // Frankfurter omits the base currency; add it explicitly as 1.0
  return { ...body.rates, [base]: 1.0 };
};
