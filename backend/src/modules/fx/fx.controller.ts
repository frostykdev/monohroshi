import type { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";
import { env } from "../../config/env";
import {
  convertAmount,
  getRates,
  refreshDailyRates,
  todayUTC,
} from "./fx.service";

const refreshSchema = z.object({
  base: z.string().trim().min(1).toUpperCase().default("USD"),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/** Protected: called by external cron/scheduler to refresh daily rates. */
export const refreshDailyController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== env.FX_REFRESH_SECRET) {
    throw new ApiError("Forbidden", HTTP_STATUS.forbidden);
  }

  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success)
    throw new ApiError("Invalid request body", HTTP_STATUS.badRequest);

  const { base, date } = parsed.data;
  const dateStr = date ?? todayUTC();

  const result = await refreshDailyRates(base, dateStr);
  res.status(HTTP_STATUS.ok).json({ success: true, data: result });
};

/** Public (authenticated): get persisted rates for a base currency + date. */
export const getRatesController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);

  const base = (req.query.base as string | undefined)?.toUpperCase() ?? "USD";
  const date = (req.query.date as string | undefined) ?? todayUTC();

  const rates = await getRates(base, date);
  res.status(HTTP_STATUS.ok).json({ success: true, data: { base, date, rates } });
};

const convertSchema = z.object({
  amount: z.coerce.number(),
  from: z.string().trim().toUpperCase(),
  to: z.string().trim().toUpperCase(),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/** Public (authenticated): convert a specific amount between currencies. */
export const convertController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);

  const parsed = convertSchema.safeParse(req.query);
  if (!parsed.success)
    throw new ApiError("Invalid query params", HTTP_STATUS.badRequest);

  const { amount, from, to, date } = parsed.data;
  const converted = await convertAmount(amount, from, to, date);

  res.status(HTTP_STATUS.ok).json({
    success: true,
    data: { amount, from, to, date: date ?? todayUTC(), converted },
  });
};
