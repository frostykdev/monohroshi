import { prisma } from "../../lib/prisma";

export const getCurrentUserByFirebaseUid = async (firebaseUid: string) => {
  return prisma.user.findUnique({
    where: { firebaseUid },
  });
};

export const completeOnboardingForCurrentUser = async (input: {
  firebaseUid: string;
  email: string | null;
  name: string | null;
  onboarding: unknown;
}) => {
  return prisma.user.upsert({
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
};
