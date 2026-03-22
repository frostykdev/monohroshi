import { prisma } from "../../lib/prisma";
import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";
import { WORKSPACE_ROLES } from "../../shared/constants";
import { ALL_DEFAULT_CATEGORIES } from "../../shared/default-categories";

export const getCurrentUserByFirebaseUid = async (firebaseUid: string) => {
  return prisma.user.findUnique({
    where: { firebaseUid },
  });
};

type CategoryInput = {
  name: string;
  type: string;
  icon: string;
  isSystem?: boolean;
  systemCode?: string;
  translationKey?: string;
};

export const completeOnboardingForCurrentUser = async (input: {
  firebaseUid: string;
  email: string | null;
  name: string | null;
  onboarding: unknown;
  workspace: { name: string; currency: string };
  account: {
    name: string;
    type: string;
    currency: string;
    balance: string;
    isPrimary: boolean;
    icon?: string;
    color?: string;
  };
  categories: CategoryInput[];
}) => {
  console.log(
    "[completeOnboarding] Starting transaction with payload keys:",
    Object.keys(input),
  );

  return prisma.$transaction(
    async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      const existingUser = await tx.user.findUnique({
        where: { firebaseUid: input.firebaseUid },
      });

      if (existingUser) {
        throw new ApiError("User is already registered", HTTP_STATUS.conflict);
      }

      const user = await tx.user.create({
        data: {
          firebaseUid: input.firebaseUid,
          email: input.email,
          name: input.name,
          onboarding: input.onboarding as never,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: input.workspace.name,
          currency: input.workspace.currency,
        },
      });

      await tx.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: WORKSPACE_ROLES.OWNER,
        },
      });

      const newAccount = await tx.account.create({
        data: {
          name: input.account.name || input.workspace.name,
          type: input.account.type,
          isPrimary: input.account.isPrimary,
          icon: input.account.icon ?? null,
          color: input.account.color ?? null,
          workspaceId: workspace.id,
        },
        select: { id: true },
      });

      await tx.accountBalance.create({
        data: {
          accountId: newAccount.id,
          currency: input.account.currency,
          balance: input.account.balance || "0",
        },
      });

      await tx.transaction.create({
        data: {
          type: "initial_balance",
          amount: input.account.balance || "0",
          currency: input.account.currency,
          date: new Date(),
          accountId: newAccount.id,
          createdById: user.id,
          workspaceId: workspace.id,
        },
      });

      const categories =
        input.categories.length > 0 ? input.categories : ALL_DEFAULT_CATEGORIES;

      await tx.category.createMany({
        data: categories.map((cat, index) => ({
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          isSystem: cat.isSystem ?? false,
          systemCode: cat.systemCode ?? null,
          translationKey: cat.translationKey ?? null,
          sortOrder: index,
          workspaceId: workspace.id,
        })),
      });

      return user;
    },
  );
};

export const deleteCurrentUser = async (firebaseUid: string): Promise<void> => {
  await prisma.$transaction(
    async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      const user = await tx.user.findUnique({ where: { firebaseUid } });

      if (!user) {
        throw new ApiError("User account not found", HTTP_STATUS.notFound);
      }

      const ownedMemberships = await tx.workspaceMember.findMany({
        where: { userId: user.id, role: WORKSPACE_ROLES.OWNER },
        select: { workspaceId: true },
      });

      const ownedWorkspaceIds = ownedMemberships.map((m) => m.workspaceId);

      if (ownedWorkspaceIds.length > 0) {
        await tx.workspace.deleteMany({
          where: { id: { in: ownedWorkspaceIds } },
        });
      }

      await tx.workspaceInvitation.deleteMany({
        where: { invitedById: user.id },
      });

      await tx.transaction.deleteMany({ where: { createdById: user.id } });

      await tx.user.delete({ where: { id: user.id } });
    },
  );
};
