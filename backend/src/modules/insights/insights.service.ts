import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";
import { env } from "../../config/env";
import { TRANSACTION_TYPES } from "../../shared/constants";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const NAVIGATE_ACTIONS: Record<string, string> = {
  create_savings_account: "/(modals)/add-account",
  create_budget: "/(modals)/add-budget",
  add_transaction: "/(modals)/add-transaction",
  view_accounts: "/(tabs)/accounts",
  view_budgets: "/settings/budgets",
  view_transactions: "/transactions",
};

const EXECUTE_ACTIONS = new Set(["execute_create_budget"]);

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
    select: {
      name: true,
      type: true,
      balances: { select: { currency: true, balance: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  const categories = await prisma.category.findMany({
    where: { workspaceId },
    select: { id: true, name: true, type: true },
    orderBy: { sortOrder: "asc" },
  });

  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const monthEnd = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    ),
  );

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
      currency: true,
      description: true,
      date: true,
      category: { select: { name: true } },
      account: { select: { name: true } },
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
    accounts: accounts.flatMap((a) =>
      a.balances.map((b) => ({
        name: a.name,
        type: a.type,
        balance: parseFloat(b.balance.toString()),
        currency: b.currency,
      })),
    ),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
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
      currency: tx.currency,
    })),
  };
};

const buildSystemPrompt = (
  context: Awaited<ReturnType<typeof gatherFinancialContext>>,
) => {
  const expenseCategories = context.categories.filter(
    (c) => c.type === "expense",
  );
  const incomeCategories = context.categories.filter(
    (c) => c.type === "income",
  );

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

EXPENSE CATEGORIES (use exact id values when suggesting budget creation):
${expenseCategories.map((c) => `- id: ${c.id}, name: ${c.name}`).join("\n") || "No expense categories."}

INCOME CATEGORIES:
${incomeCategories.map((c) => `- id: ${c.id}, name: ${c.name}`).join("\n") || "No income categories."}

RECENT TRANSACTIONS (this month, up to 50):
${context.recentTransactions.map((tx) => `- ${tx.date}: ${tx.type} ${tx.amount} ${tx.currency} ${tx.category ? `[${tx.category}]` : ""} ${tx.description ?? ""} (${tx.account})`).join("\n") || "No transactions this month."}

RULES:
- Be concise and conversational.
- Use **bold** markdown for key numbers or important terms.
- Analyze the data above to give personalized advice.
- For longer responses that cover multiple topics, use ## headers to create logical sections (e.g. ## Overview, ## Key Issues, ## Recommendations). Keep each section focused and scannable.
- Use --- (horizontal rule) only to separate clearly distinct topics, not between every paragraph.
- For short single-topic responses, skip headers entirely — write in plain flowing text.

ACTION RULES — there are two kinds of actions:

1. NAVIGATE actions: open a screen in the app. Use when pointing the user somewhere to do something themselves.
   Available action_keys: create_savings_account, create_budget, add_transaction, view_accounts, view_budgets, view_transactions
   For these, set params.categoryId, params.categoryName, params.amount all to "".

2. EXECUTE actions: you perform the operation on behalf of the user. Only use these when the user has EXPLICITLY confirmed BOTH the category AND the amount they want (they said "yes", "confirm", "do it", or provided final numbers). Do NOT use execute actions based on speculation.
   Available action_keys: execute_create_budget
   For execute_create_budget, populate params.categoryId with the exact id from the EXPENSE CATEGORIES list, params.categoryName with the category display name, and params.amount as a numeric string (e.g. "5000").

- Only suggest actions that are relevant to your advice.
- Use the user's currency (${context.currency}) when mentioning amounts.
- If the user asks about something unrelated to finances, gently redirect them.`;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type InsightsActionParams = {
  categoryId: string;
  categoryName: string;
  amount: string;
};

export type InsightsAction = {
  label: string;
  route?: string;
  isExecutable: boolean;
  actionKey: string;
  params: InsightsActionParams;
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
    throw new ApiError(
      "AI features are not configured",
      HTTP_STATUS.serviceUnavailable,
    );
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
    model: "gpt-4o",
    messages,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "insights_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            reply: {
              type: "string",
              description: "The assistant's text reply.",
            },
            actions: {
              type: "array",
              description: "Suggested app actions. Only include if relevant.",
              items: {
                type: "object",
                properties: {
                  label: {
                    type: "string",
                    description: "Button label shown to the user.",
                  },
                  action_key: {
                    type: "string",
                    enum: [
                      ...Object.keys(NAVIGATE_ACTIONS),
                      ...Array.from(EXECUTE_ACTIONS),
                    ],
                    description: "The action key.",
                  },
                  params: {
                    type: "object",
                    description:
                      "Parameters for execute actions. Use empty strings for navigate actions.",
                    properties: {
                      categoryId: {
                        type: "string",
                        description: "Category id (for execute_create_budget).",
                      },
                      categoryName: {
                        type: "string",
                        description:
                          "Category display name (for execute_create_budget).",
                      },
                      amount: {
                        type: "string",
                        description:
                          "Budget amount as a numeric string (for execute_create_budget).",
                      },
                    },
                    required: ["categoryId", "categoryName", "amount"],
                    additionalProperties: false,
                  },
                },
                required: ["label", "action_key", "params"],
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
    max_tokens: 800,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new ApiError("No response from AI", HTTP_STATUS.serviceUnavailable);
  }

  const parsed = JSON.parse(content) as {
    reply: string;
    actions: {
      label: string;
      action_key: string;
      params: InsightsActionParams;
    }[];
  };

  const actions: InsightsAction[] = parsed.actions
    .filter(
      (a) => NAVIGATE_ACTIONS[a.action_key] || EXECUTE_ACTIONS.has(a.action_key),
    )
    .map((a) => ({
      label: a.label,
      route: NAVIGATE_ACTIONS[a.action_key],
      isExecutable: EXECUTE_ACTIONS.has(a.action_key),
      actionKey: a.action_key,
      params: a.params,
    }));

  return { reply: parsed.reply, actions };
};
