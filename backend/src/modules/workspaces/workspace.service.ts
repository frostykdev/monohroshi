import { prisma } from "../../lib/prisma";
import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";
import { INVITATION_STATUSES, WORKSPACE_ROLES } from "../../shared/constants";

const workspaceWithMembers = {
  id: true,
  name: true,
  currency: true,
  members: {
    select: {
      role: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  },
  invitations: {
    where: { status: INVITATION_STATUSES.PENDING },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
    },
  },
} as const;

type RawWorkspace = {
  id: string;
  name: string;
  currency: string;
  members: { role: string; user: { id: string; name: string | null; email: string | null } }[];
  invitations: { id: string; email: string; role: string; status: string }[];
};

const formatWorkspace = (workspace: RawWorkspace) => ({
  id: workspace.id,
  name: workspace.name,
  currency: workspace.currency,
  members: workspace.members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
  })),
  pendingInvitations: workspace.invitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
  })),
});

export const getCurrentWorkspaceForUser = async (firebaseUid: string) => {
  const user = await prisma.user.findUnique({ where: { firebaseUid } });

  if (!user) {
    throw new ApiError("User not found", HTTP_STATUS.notFound);
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: { workspace: { select: workspaceWithMembers } },
  });

  if (!membership) {
    throw new ApiError("No workspace found", HTTP_STATUS.notFound);
  }

  return formatWorkspace(membership.workspace as RawWorkspace);
};

export const updateCurrentWorkspace = async (
  firebaseUid: string,
  name: string,
) => {
  const user = await prisma.user.findUnique({ where: { firebaseUid } });

  if (!user) {
    throw new ApiError("User not found", HTTP_STATUS.notFound);
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: user.id,
      role: { in: [WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.ADMIN] },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) {
    throw new ApiError(
      "No workspace found or insufficient permissions",
      HTTP_STATUS.forbidden,
    );
  }

  const workspace = await prisma.workspace.update({
    where: { id: membership.workspaceId },
    data: { name },
    select: workspaceWithMembers,
  });

  return formatWorkspace(workspace as RawWorkspace);
};

export const inviteToCurrentWorkspace = async (
  firebaseUid: string,
  email: string,
) => {
  const user = await prisma.user.findUnique({ where: { firebaseUid } });

  if (!user) {
    throw new ApiError("User not found", HTTP_STATUS.notFound);
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: user.id,
      role: { in: [WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.ADMIN] },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) {
    throw new ApiError(
      "No workspace found or insufficient permissions",
      HTTP_STATUS.forbidden,
    );
  }

  const existingInvite = await prisma.workspaceInvitation.findFirst({
    where: {
      workspaceId: membership.workspaceId,
      email,
      status: INVITATION_STATUSES.PENDING,
    },
  });

  if (existingInvite) {
    throw new ApiError(
      "An invitation for this email is already pending",
      HTTP_STATUS.conflict,
    );
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.workspaceInvitation.create({
    data: {
      workspaceId: membership.workspaceId,
      invitedById: user.id,
      email,
      role: WORKSPACE_ROLES.MEMBER,
      status: INVITATION_STATUSES.PENDING,
      expiresAt,
    },
  });

  // Mock: log the invite email instead of sending
  console.log(
    `[workspace.invite] Invitation email to "${email}" for workspace ${membership.workspaceId} (mock — not sent)`,
  );
};

export const getAllWorkspacesForUser = async (firebaseUid: string) => {
  const user = await prisma.user.findUnique({ where: { firebaseUid } });

  if (!user) {
    throw new ApiError("User not found", HTTP_STATUS.notFound);
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          currency: true,
          _count: { select: { members: true } },
        },
      },
    },
  });

  return memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    currency: m.workspace.currency,
    membersCount: m.workspace._count.members,
    role: m.role,
  }));
};

export const getWorkspaceByIdForUser = async (
  firebaseUid: string,
  workspaceId: string,
) => {
  const user = await prisma.user.findUnique({ where: { firebaseUid } });

  if (!user) {
    throw new ApiError("User not found", HTTP_STATUS.notFound);
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId } },
  });

  if (!membership) {
    throw new ApiError("Workspace not found", HTTP_STATUS.notFound);
  }

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: workspaceWithMembers,
  });

  return formatWorkspace(workspace as RawWorkspace);
};

export const createWorkspaceForUser = async (
  firebaseUid: string,
  name: string,
) => {
  const user = await prisma.user.findUnique({ where: { firebaseUid } });

  if (!user) {
    throw new ApiError("User not found", HTTP_STATUS.notFound);
  }

  const firstMembership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: { workspace: { select: { currency: true } } },
  });

  const currency = firstMembership?.workspace.currency ?? "USD";

  const workspace = await prisma.$transaction(async (tx) => {
    const newWorkspace = await tx.workspace.create({
      data: { name, currency },
    });

    await tx.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: newWorkspace.id,
        role: WORKSPACE_ROLES.OWNER,
      },
    });

    return tx.workspace.findUniqueOrThrow({
      where: { id: newWorkspace.id },
      select: workspaceWithMembers,
    });
  });

  return formatWorkspace(workspace as RawWorkspace);
};

export const cancelInvitation = async (
  firebaseUid: string,
  inviteId: string,
) => {
  const user = await prisma.user.findUnique({ where: { firebaseUid } });

  if (!user) {
    throw new ApiError("User not found", HTTP_STATUS.notFound);
  }

  const invite = await prisma.workspaceInvitation.findUnique({
    where: { id: inviteId },
  });

  if (!invite) {
    throw new ApiError("Invitation not found", HTTP_STATUS.notFound);
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: user.id, workspaceId: invite.workspaceId },
    },
  });

  const privilegedRoles: string[] = [WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.ADMIN];

  if (!membership || !privilegedRoles.includes(membership.role)) {
    throw new ApiError("Not authorized", HTTP_STATUS.forbidden);
  }

  await prisma.workspaceInvitation.delete({ where: { id: inviteId } });
};
