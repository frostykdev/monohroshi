import { prisma } from "../../lib/prisma";
import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";

const tagSelect = {
  id: true,
  name: true,
  color: true,
} as const;

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

export const getTagsForUser = async (
  firebaseUid: string,
  workspaceId?: string,
) => {
  const user = await getUser(firebaseUid);
  const wsId = await resolveWorkspaceId(user.id, workspaceId);

  return prisma.tag.findMany({
    where: { workspaceId: wsId },
    orderBy: { name: "asc" },
    select: tagSelect,
  });
};

export const createTagForUser = async (
  firebaseUid: string,
  data: { name: string; color?: string; workspaceId?: string },
) => {
  const user = await getUser(firebaseUid);
  const wsId = await resolveWorkspaceId(user.id, data.workspaceId);

  const existing = await prisma.tag.findFirst({
    where: { workspaceId: wsId, name: { equals: data.name, mode: "insensitive" } },
  });
  if (existing) {
    throw new ApiError("A tag with this name already exists", HTTP_STATUS.conflict);
  }

  return prisma.tag.create({
    data: {
      name: data.name.trim(),
      color: data.color ?? null,
      workspaceId: wsId,
    },
    select: tagSelect,
  });
};

export const updateTagForUser = async (
  firebaseUid: string,
  tagId: string,
  data: { name?: string; color?: string | null },
) => {
  const user = await getUser(firebaseUid);

  const tag = await prisma.tag.findFirst({
    where: {
      id: tagId,
      workspace: { members: { some: { userId: user.id } } },
    },
    select: { id: true, workspaceId: true },
  });

  if (!tag) {
    throw new ApiError("Tag not found", HTTP_STATUS.notFound);
  }

  if (data.name !== undefined) {
    const duplicate = await prisma.tag.findFirst({
      where: {
        workspaceId: tag.workspaceId,
        name: { equals: data.name, mode: "insensitive" },
        id: { not: tagId },
      },
    });
    if (duplicate) {
      throw new ApiError("A tag with this name already exists", HTTP_STATUS.conflict);
    }
  }

  return prisma.tag.update({
    where: { id: tagId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.color !== undefined && { color: data.color }),
    },
    select: tagSelect,
  });
};

export const deleteTagForUser = async (
  firebaseUid: string,
  tagId: string,
) => {
  const user = await getUser(firebaseUid);

  const tag = await prisma.tag.findFirst({
    where: {
      id: tagId,
      workspace: { members: { some: { userId: user.id } } },
    },
    select: { id: true },
  });

  if (!tag) {
    throw new ApiError("Tag not found", HTTP_STATUS.notFound);
  }

  await prisma.tag.delete({ where: { id: tagId } });
};
