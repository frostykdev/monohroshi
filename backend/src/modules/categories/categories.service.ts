import { prisma } from "../../lib/prisma";
import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";

const categorySelect = {
  id: true,
  name: true,
  type: true,
  icon: true,
  color: true,
  isSystem: true,
  systemCode: true,
  sortOrder: true,
} as const;

const resolveWorkspaceId = async (
  userId: string,
  workspaceId?: string,
): Promise<string> => {
  if (workspaceId) {
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId },
      select: { workspaceId: true },
    });
    if (!membership) {
      throw new ApiError("Workspace not found", HTTP_STATUS.notFound);
    }
    return workspaceId;
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true },
  });
  if (!membership) {
    throw new ApiError("No workspace found", HTTP_STATUS.notFound);
  }
  return membership.workspaceId;
};

const getUser = async (firebaseUid: string) => {
  const user = await prisma.user.findUnique({ where: { firebaseUid } });
  if (!user) throw new ApiError("User not found", HTTP_STATUS.notFound);
  return user;
};

export const getCategoriesForUser = async (
  firebaseUid: string,
  workspaceId?: string,
) => {
  const user = await getUser(firebaseUid);
  const wsId = await resolveWorkspaceId(user.id, workspaceId);

  return prisma.category.findMany({
    where: { workspaceId: wsId, isArchived: false },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
    select: categorySelect,
  });
};

export const createCategoryForUser = async (
  firebaseUid: string,
  data: { name: string; type: string; icon?: string; workspaceId?: string },
) => {
  const user = await getUser(firebaseUid);
  const wsId = await resolveWorkspaceId(user.id, data.workspaceId);

  return prisma.category.create({
    data: {
      name: data.name,
      type: data.type,
      icon: data.icon ?? null,
      workspaceId: wsId,
    },
    select: categorySelect,
  });
};

export const deleteCategoryForUser = async (
  firebaseUid: string,
  categoryId: string,
) => {
  const user = await getUser(firebaseUid);

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      workspace: {
        members: { some: { userId: user.id } },
      },
    },
    select: { id: true, isSystem: true },
  });

  if (!category) {
    throw new ApiError("Category not found", HTTP_STATUS.notFound);
  }

  if (category.isSystem) {
    throw new ApiError(
      "System categories cannot be deleted",
      HTTP_STATUS.forbidden,
    );
  }

  await prisma.category.delete({ where: { id: categoryId } });
};
