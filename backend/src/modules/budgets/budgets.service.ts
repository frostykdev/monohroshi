import { prisma } from "../../lib/prisma";
import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";
import { TRANSACTION_TYPES } from "../../shared/constants";

const getUser = async (firebaseUid: string) => {
  const user = await prisma.user.findUnique({ where: { firebaseUid } });
  if (!user) throw new ApiError("User not found", HTTP_STATUS.notFound);
  return user;
};

const resolveWorkspaceId = async (
  userId: string,
  workspaceId?: string,
): Promise<string> => {
  if (workspaceId) {
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId },
      select: { workspaceId: true },
    });
    if (!membership)
      throw new ApiError("Workspace not found", HTTP_STATUS.notFound);
    return workspaceId;
  }
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true },
  });
  if (!membership)
    throw new ApiError("No workspace found", HTTP_STATUS.notFound);
  return membership.workspaceId;
};

const verifyBudgetAccess = async (userId: string, budgetId: string) => {
  const budget = await prisma.budget.findFirst({
    where: {
      id: budgetId,
      workspace: { members: { some: { userId } } },
    },
    select: { id: true, workspaceId: true },
  });
  if (!budget) throw new ApiError("Budget not found", HTTP_STATUS.notFound);
  return budget;
};

const getMonthRange = (monthStart: Date) => {
  const start = new Date(monthStart);
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
};

const computeSpent = async (
  workspaceId: string,
  categoryId: string | null,
  monthStart: Date,
): Promise<number> => {
  const { start, end } = getMonthRange(monthStart);

  const result = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: {
      workspaceId,
      type: TRANSACTION_TYPES.EXPENSE,
      date: { gte: start, lt: end },
      ...(categoryId ? { categoryId } : {}),
    },
  });

  return parseFloat(result._sum.amount?.toString() ?? "0");
};

const budgetSelect = {
  id: true,
  amount: true,
  monthStart: true,
  workspaceId: true,
  categoryId: true,
  category: {
    select: { id: true, name: true, icon: true, color: true },
  },
  createdById: true,
  createdAt: true,
  updatedAt: true,
} as const;

type BudgetWithSpent = {
  id: string;
  amount: string;
  monthStart: string;
  workspaceId: string;
  categoryId: string | null;
  category: { id: string; name: string; icon: string | null; color: string | null } | null;
  spent: number;
  remaining: number;
};

const formatBudget = async (raw: {
  id: string;
  amount: { toString(): string };
  monthStart: Date;
  workspaceId: string;
  categoryId: string | null;
  category: { id: string; name: string; icon: string | null; color: string | null } | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}): Promise<BudgetWithSpent> => {
  const spent = await computeSpent(raw.workspaceId, raw.categoryId, raw.monthStart);
  const amount = parseFloat(raw.amount.toString());
  return {
    id: raw.id,
    amount: raw.amount.toString(),
    monthStart: raw.monthStart.toISOString(),
    workspaceId: raw.workspaceId,
    categoryId: raw.categoryId,
    category: raw.category,
    spent,
    remaining: Math.max(0, amount - spent),
  };
};

/**
 * Auto-rollover: if current month has no budgets, copy previous month's budgets.
 */
const rolloverIfNeeded = async (
  workspaceId: string,
  userId: string,
  currentMonthStart: Date,
): Promise<void> => {
  const { start } = getMonthRange(currentMonthStart);

  const existing = await prisma.budget.count({
    where: { workspaceId, monthStart: start },
  });

  if (existing > 0) return;

  const prevMonthStart = new Date(start);
  prevMonthStart.setUTCMonth(prevMonthStart.getUTCMonth() - 1);

  const prevBudgets = await prisma.budget.findMany({
    where: { workspaceId, monthStart: prevMonthStart },
    select: { amount: true, categoryId: true },
  });

  if (prevBudgets.length === 0) return;

  await prisma.budget.createMany({
    data: prevBudgets.map((b) => ({
      amount: b.amount,
      categoryId: b.categoryId,
      monthStart: start,
      workspaceId,
      createdById: userId,
    })),
    skipDuplicates: true,
  });
};

export const getBudgetsForWorkspace = async (
  firebaseUid: string,
  workspaceId?: string,
  month?: string,
) => {
  const user = await getUser(firebaseUid);
  const wsId = await resolveWorkspaceId(user.id, workspaceId);

  const monthStart = month
    ? new Date(`${month}-01T00:00:00.000Z`)
    : new Date(
        Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
      );

  await rolloverIfNeeded(wsId, user.id, monthStart);

  const { start } = getMonthRange(monthStart);

  const budgets = await prisma.budget.findMany({
    where: { workspaceId: wsId, monthStart: start },
    orderBy: { createdAt: "asc" },
    select: budgetSelect,
  });

  return Promise.all(budgets.map(formatBudget));
};

export const createBudgetForWorkspace = async (
  firebaseUid: string,
  data: {
    amount: string;
    categoryId?: string | null;
    workspaceId?: string;
    month?: string;
  },
) => {
  const user = await getUser(firebaseUid);
  const wsId = await resolveWorkspaceId(user.id, data.workspaceId);

  const monthStart = data.month
    ? new Date(`${data.month}-01T00:00:00.000Z`)
    : new Date(
        Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
      );

  const { start } = getMonthRange(monthStart);

  // Enforce uniqueness (one general + one per category per month)
  const existing = await prisma.budget.findFirst({
    where: {
      workspaceId: wsId,
      monthStart: start,
      categoryId: data.categoryId ?? null,
    },
    select: { id: true },
  });

  if (existing) {
    throw new ApiError(
      "A budget for this scope and month already exists",
      HTTP_STATUS.conflict,
    );
  }

  if (data.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, workspaceId: wsId },
      select: { id: true },
    });
    if (!category)
      throw new ApiError("Category not found", HTTP_STATUS.notFound);
  }

  const raw = await prisma.budget.create({
    data: {
      amount: data.amount,
      categoryId: data.categoryId ?? null,
      monthStart: start,
      workspaceId: wsId,
      createdById: user.id,
    },
    select: budgetSelect,
  });

  return formatBudget(raw);
};

export const updateBudgetForWorkspace = async (
  firebaseUid: string,
  budgetId: string,
  data: { amount?: string },
) => {
  const user = await getUser(firebaseUid);
  await verifyBudgetAccess(user.id, budgetId);

  const raw = await prisma.budget.update({
    where: { id: budgetId },
    data: {
      ...(data.amount !== undefined && { amount: data.amount }),
    },
    select: budgetSelect,
  });

  return formatBudget(raw);
};

export const deleteBudgetForWorkspace = async (
  firebaseUid: string,
  budgetId: string,
) => {
  const user = await getUser(firebaseUid);
  await verifyBudgetAccess(user.id, budgetId);
  await prisma.budget.delete({ where: { id: budgetId } });
};
