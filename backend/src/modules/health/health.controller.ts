import type { Request, Response } from "express";

import { getHealthStatus } from "./health.service";

export const getHealthController = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: getHealthStatus(),
  });
};
