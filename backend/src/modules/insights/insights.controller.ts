import type { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";
import { chat } from "./insights.service";

const chatSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(50)
    .default([]),
  workspaceId: z.string().optional(),
});

export const chatController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);

  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success)
    throw new ApiError("Invalid request body", HTTP_STATUS.badRequest);

  const result = await chat(
    req.user.uid,
    parsed.data.message,
    parsed.data.history,
    parsed.data.workspaceId,
  );

  res.status(HTTP_STATUS.ok).json({ success: true, data: result });
};
