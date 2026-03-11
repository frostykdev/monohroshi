import type { Request, Response } from "express";

import { getOrCreateCurrentUser } from "./auth.service";

export const getMeController = async (req: Request, res: Response): Promise<void> => {
  const firebaseUser = req.user;

  if (!firebaseUser) {
    res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
    return;
  }

  const user = await getOrCreateCurrentUser({
    firebaseUid: firebaseUser.uid,
    email: firebaseUser.email ?? null,
    name: firebaseUser.name ?? null,
  });

  res.status(200).json({
    success: true,
    data: {
      user,
      firebase: {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? null,
      },
    },
  });
};
