import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";
import { env } from "../../config/env";
import { TRANSACTION_TYPES } from "../../shared/constants";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const ALLOWED_ACTIONS: Record<string, string> = {
  create_savings_account: "/(modals)/add-account",
  create_budget: "/(modals)/add-budget",
  add_transaction: "/(modals)/add-transaction",
  view_accounts: "/(tabs)/accounts",
  view_budgets: "/settings/budgets",
  view_transactions: "/transactions",
};

const getUser = async (firebaseUid: string) => {
  const user = await prisma.user.findUnique({ where: { firebaseUid } });
  if (!user) throw new ApiError("User not found", HTTP_STATUS.notFound);
  return user;
};

const resolveWorkspaceId = async (userId: string, workspaceId?: string) => {
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

const gatherFinancialContext = async (workspaceId: string) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true, currency: true },
  });

  const accounts = await prisma.account.findMany({
    where: { workspaceId, isArchived: false },
    select: { name: true, type: true, balance: true, currency: true },
    orderBy: { sortOrder: "asc" },
  });

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  const recentTransactions = await prisma.transaction.findMany({
    where: {
      workspaceId,
      type: { in: [TRANSACTION_TYPES.EXPENSE, TRANSACTION_TYPES.INCOME] },
      date: { gte: monthStart, lte: monthEnd },
    },
    orderBy: { date: "desc" },
    take: 50,
    select: {
      type: true,
      amount: true,
      description: true,
      date: true,
      category: { select: { name: true } },
      account: { select: { name: true, currency: true } },
    },
  });

  const budgets = await prisma.budget.findMany({
    where: { workspaceId, monthStart },
    select: {
      amount: true,
      categoryId: true,
      category: { select: { name: true } },
    },
  });

  const budgetsWithSpent = await Promise.all(
    budgets.map(async (b) => {
      const spent = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          workspaceId,
          type: TRANSACTION_TYPES.EXPENSE,
          date: { gte: monthStart, lte: monthEnd },
          ...(b.categoryId ? { categoryId: b.categoryId } : {}),
        },
      });
      const spentAmount = parseFloat(spent._sum.amount?.toString() ?? "0");
      return {
        category: b.category?.name ?? "Overall",
        limit: parseFloat(b.amount.toString()),
        spent: Math.round(spentAmount * 100) / 100,
      };
    }),
  );

  const expenseAgg = await prisma.transaction.aggregate({
    _sum: { amount: true },
    _count: { id: true },
    where: {
      workspaceId,
      type: TRANSACTION_TYPES.EXPENSE,
      date: { gte: monthStart, lte: monthEnd },
    },
  });

  const incomeAgg = await prisma.transaction.aggregate({
    _sum: { amount: true },
    _count: { id: true },
    where: {
      workspaceId,
      type: TRANSACTION_TYPES.INCOME,
      date: { gte: monthStart, lte: monthEnd },
    },
  });

  return {
    currency: workspace?.currency ?? "USD",
    accounts: accounts.map((a) => ({
      name: a.name,
      type: a.type,
      balance: parseFloat(a.balance.toString()),
      currency: a.currency,
    })),
    thisMonth: {
      totalExpenses: parseFloat(expenseAgg._sum.amount?.toString() ?? "0"),
      expenseCount: expenseAgg._count.id,
      totalIncome: parseFloat(incomeAgg._sum.amount?.toString() ?? "0"),
      incomeCount: incomeAgg._count.id,
    },
    budgets: budgetsWithSpent,
    recentTransactions: recentTransactions.map((tx) => ({
      type: tx.type,
      amount: parseFloat(tx.amount.toString()),
      description: tx.description,
      date: tx.date.toISOString().slice(0, 10),
      category: tx.category?.name ?? null,
      account: tx.account.name,
      currency: tx.account.currency,
    })),
  };
};

const buildSystemPrompt = (context: Awaited<ReturnType<typeof gatherFinancialContext>>) => {
  return `You are a helpful personal finance advisor built into the Monohroshi finance app. The user is chatting with you about their finances.

FINANCIAL CONTEXT (current workspace, primary currency: ${context.currency}):

ACCOUNTS:
${context.accounts.map((a) => `- ${a.name} (${a.type}): ${a.balance} ${a.currency}`).join("\n") || "No accounts yet."}

THIS MONTH SUMMARY:
- Total expenses: ${context.thisMonth.totalExpenses} ${context.currency} (${context.thisMonth.expenseCount} transactions)
- Total income: ${context.thisMonth.totalIncome} ${context.currency} (${context.thisMonth.incomeCount} transactions)
- Net: ${(context.thisMonth.totalIncome - context.thisMonth.totalExpenses).toFixed(2)} ${context.currency}

BUDGETS (this month):
${context.budgets.map((b) => `- ${b.category}: limit ${b.limit} ${context.currency}, spent ${b.spent} ${context.currency}, remaining ${(b.limit - b.spent).toFixed(2)} ${context.currency}`).join("\n") || "No budgets set."}

RECENT TRANSACTIONS (this month, up to 50):
${context.recentTransactions.map((tx) => `- ${tx.date}: ${tx.type} ${tx.amount} ${tx.currency} ${tx.category ? `[${tx.category}]` : ""} ${tx.description ?? ""} (${tx.account})`).join("\n") || "No transactions this month."}

RULES:
- Be concise and conversational. Keep responses under 200 words.
- Analyze the data above to give personalized advice.
- When you suggest an action the user can take in the app, include it in the "actions" array of your response.
- Available actions (use these exact keys):
  * "create_savings_account" — suggest creating a new savings account
  * "create_budget" — suggest creating or adjusting a budget
  * "add_transaction" — suggest logging a transaction
  * "view_accounts" — suggest reviewing accounts
  * "view_budgets" — suggest reviewing budgets
  * "view_transactions" — suggest reviewing transaction history
- Only suggest actions when they are relevant to your advice. Do not force them.
- Use the user's currency when mentioning amounts.
- If the user asks about something unrelated to finances, gently redirect them.`;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type InsightsAction = {
  label: string;
  route: string;
};

export type InsightsResponse = {
  reply: string;
  actions: InsightsAction[];
};

export const chat = async (
  firebaseUid: string,
  message: string,
  history: ChatMessage[],
  workspaceId?: string,
): Promise<InsightsResponse> => {
  if (!env.OPENAI_API_KEY) {
    throw new ApiError("AI features are not configured", HTTP_STATUS.serviceUnavailable);
  }

  const user = await getUser(firebaseUid);
  const wsId = await resolveWorkspaceId(user.id, workspaceId);
  const context = await gatherFinancialContext(wsId);
  const systemPrompt = buildSystemPrompt(context);

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "insights_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            reply: { type: "string", description: "The assistant's text reply." },
            actions: {
              type: "array",
              description: "Suggested app actions. Only include if relevant.",
              items: {
                type: "object",
                properties: {
                  label: { type: "string", description: "Button label shown to the user." },
                  action_key: {
                    type: "string",
                    enum: Object.keys(ALLOWED_ACTIONS),
                    description: "The action key.",
                  },
                },
                required: ["label", "action_key"],
                additionalProperties: false,
              },
            },
          },
          required: ["reply", "actions"],
          additionalProperties: false,
        },
      },
    },
    temperature: 0.7,
    max_tokens: 600,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new ApiError("No response from AI", HTTP_STATUS.serviceUnavailable);
  }

  const parsed = JSON.parse(content) as {
    reply: string;
    actions: { label: string; action_key: string }[];
  };

  const actions: InsightsAction[] = parsed.actions
    .filter((a) => ALLOWED_ACTIONS[a.action_key])
    .map((a) => ({
      label: a.label,
      route: ALLOWED_ACTIONS[a.action_key],
    }));

  return { reply: parsed.reply, actions };
};
