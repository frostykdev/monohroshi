import type { ErrorRequestHandler } from "express";

import { env } from "../config/env";
import { ApiError } from "../shared/errors/api-error";
import { HTTP_STATUS } from "../shared/http-status";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
    return;
  }

  const isProduction = env.NODE_ENV === "production";

  res.status(HTTP_STATUS.internalServerError).json({
    success: false,
    message: "Internal server error",
    ...(isProduction ? {} : { details: error.message }),
  });
};
