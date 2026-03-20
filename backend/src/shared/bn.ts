import BigNumber from "bignumber.js";

BigNumber.config({
  DECIMAL_PLACES: 2,
  ROUNDING_MODE: BigNumber.ROUND_HALF_UP,
});

export const bn = (v: string | number) => new BigNumber(v);

/** Returns a string rounded to 2 decimal places (e.g. "1234.56") */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const bnRound = (v: any): string => bnParse(v).toFixed(2);

/** Parse any value (including Prisma Decimal), returning 0 when invalid */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const bnParse = (v: any): BigNumber => {
  const n = new BigNumber(v != null ? String(v) : 0);
  return n.isNaN() ? new BigNumber(0) : n;
};
