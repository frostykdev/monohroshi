import { prisma } from "../../lib/prisma";
import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";

const accountSelect = {
  id: true,
  name: true,
  type: true,
  balance: true,
  currency: true,
  icon: true,
  color: true,
  isPrimary: true,
  isArchived: true,
  sortOrder: true,
} as const;

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

const verifyAccountAccess = async (userId: string, accountId: string) => {
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      workspace: { members: { some: { userId } } },
    },
    select: { id: true },
  });
  if (!account) throw new ApiError("Account not found", HTTP_STATUS.notFound);
  return account;
};

export const getAccountsForWorkspace = async (
  firebaseUid: string,
  workspaceId?: string,
) => {
  const user = await getUser(firebaseUid);
  const wsId = await resolveWorkspaceId(user.id, workspaceId);

  return prisma.account.findMany({
    where: { workspaceId: wsId, isArchived: false },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: accountSelect,
  });
};

export const getAccountById = async (
  firebaseUid: string,
  accountId: string,
) => {
  const user = await getUser(firebaseUid);
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      workspace: { members: { some: { userId: user.id } } },
      isArchived: false,
    },
    select: accountSelect,
  });
  if (!account) throw new ApiError("Account not found", HTTP_STATUS.notFound);
  return account;
};

export const createAccountForUser = async (
  firebaseUid: string,
  data: {
    name: string;
    type: string;
    currency: string;
    balance?: string;
    icon?: string;
    color?: string;
    isPrimary?: boolean;
    workspaceId?: string;
  },
) => {
  const user = await getUser(firebaseUid);
  const wsId = await resolveWorkspaceId(user.id, data.workspaceId);

  return prisma.account.create({
    data: {
      name: data.name,
      type: data.type,
      currency: data.currency,
      balance: data.balance ?? "0",
      icon: data.icon ?? null,
      color: data.color ?? null,
      isPrimary: data.isPrimary ?? false,
      workspaceId: wsId,
    },
    select: accountSelect,
  });
};

export const updateAccountForUser = async (
  firebaseUid: string,
  accountId: string,
  data: {
    name?: string;
    type?: string;
    currency?: string;
    icon?: string;
    color?: string;
    isPrimary?: boolean;
  },
) => {
  const user = await getUser(firebaseUid);
  await verifyAccountAccess(user.id, accountId);

  return prisma.account.update({
    where: { id: accountId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
    },
    select: accountSelect,
  });
};

export const deleteAccountForUser = async (
  firebaseUid: string,
  accountId: string,
) => {
  const user = await getUser(firebaseUid);
  await verifyAccountAccess(user.id, accountId);
  await prisma.account.update({
    where: { id: accountId },
    data: { isArchived: true },
  });
};

export const getTransactionsForAccount = async (
  firebaseUid: string,
  accountId: string,
  limit = 50,
) => {
  const user = await getUser(firebaseUid);
  await verifyAccountAccess(user.id, accountId);

  return prisma.transaction.findMany({
    where: {
      OR: [{ accountId }, { destinationAccountId: accountId }],
    },
    orderBy: { date: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      amount: true,
      destinationAmount: true,
      description: true,
      date: true,
      account: {
        select: { id: true, name: true, currency: true, icon: true, color: true },
      },
      destinationAccount: {
        select: { id: true, name: true, currency: true, icon: true, color: true },
      },
      category: {
        select: { id: true, name: true, icon: true, color: true },
      },
    },
  });
};
