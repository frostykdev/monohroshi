import { Router } from "express";

import { authRouter } from "../modules/auth/auth.routes";
import { healthRouter } from "../modules/health/health.routes";

const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/", authRouter);

export { apiRouter };
