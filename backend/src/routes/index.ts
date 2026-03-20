import { Router } from "express";

import { authRouter } from "../modules/auth/auth.routes";
import { healthRouter } from "../modules/health/health.routes";
import { workspaceRouter } from "../modules/workspaces/workspace.routes";
import { categoriesRouter } from "../modules/categories/categories.routes";
import { accountsRouter } from "../modules/accounts/accounts.routes";
import { budgetsRouter } from "../modules/budgets/budgets.routes";
import { transactionsRouter } from "../modules/transactions/transactions.routes";
import { fxRouter } from "../modules/fx/fx.routes";
import { tagsRouter } from "../modules/tags/tags.routes";
import { insightsRouter } from "../modules/insights/insights.routes";

const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/workspaces", workspaceRouter);
apiRouter.use("/categories", categoriesRouter);
apiRouter.use("/accounts", accountsRouter);
apiRouter.use("/budgets", budgetsRouter);
apiRouter.use("/transactions", transactionsRouter);
apiRouter.use("/fx", fxRouter);
apiRouter.use("/tags", tagsRouter);
apiRouter.use("/insights", insightsRouter);
apiRouter.use("/", authRouter);

export { apiRouter };
