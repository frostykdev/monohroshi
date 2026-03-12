import { prisma } from "../../lib/prisma";
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
  console.log("[completeOnboarding] Starting transaction with payload keys:", Object.keys(input));

  return prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
    const user = await tx.user.upsert({
      where: { firebaseUid: input.firebaseUid },
      create: {
        firebaseUid: input.firebaseUid,
        email: input.email,
        name: input.name,
        onboarding: input.onboarding as never,
      },
      update: {
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

    await tx.account.create({
      data: {
        name: input.account.name || input.workspace.name,
        type: input.account.type,
        currency: input.account.currency,
        balance: input.account.balance || "0",
        isPrimary: input.account.isPrimary,
        icon: input.account.icon ?? null,
        color: input.account.color ?? null,
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
        sortOrder: index,
        workspaceId: workspace.id,
      })),
    });

    return user;
  });
};
