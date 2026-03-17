import BigNumber from "bignumber.js";

BigNumber.config({
  DECIMAL_PLACES: 2,
  ROUNDING_MODE: BigNumber.ROUND_HALF_UP,
});

export const bn = (v: string | number) => new BigNumber(v);

/** Returns a string rounded to 2 decimal places (e.g. "1234.56") */
export const bnRound = (v: string | number): string =>
  new BigNumber(v).toFixed(2);

/** Parse a stored string, returning 0 when invalid */
export const bnParse = (v: string | number | null | undefined): BigNumber =>
  new BigNumber(v ?? 0).isNaN() ? new BigNumber(0) : new BigNumber(v ?? 0);

/** Absolute value as BigNumber */
export const bnAbs = (v: string | number) => new BigNumber(v).abs();
