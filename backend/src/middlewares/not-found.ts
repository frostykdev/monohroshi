import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../shared/errors/api-error";
import { HTTP_STATUS } from "../shared/http-status";

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new ApiError("Route not found", HTTP_STATUS.notFound));
};
