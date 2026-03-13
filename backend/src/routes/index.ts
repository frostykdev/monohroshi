import { Router } from "express";

import { authRouter } from "../modules/auth/auth.routes";
import { healthRouter } from "../modules/health/health.routes";
import { workspaceRouter } from "../modules/workspaces/workspace.routes";
import { categoriesRouter } from "../modules/categories/categories.routes";

const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/workspaces", workspaceRouter);
apiRouter.use("/categories", categoriesRouter);
apiRouter.use("/", authRouter);

export { apiRouter };
