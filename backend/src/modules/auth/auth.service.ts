import { prisma } from "../../lib/prisma";

export const getOrCreateCurrentUser = async (input: {
  firebaseUid: string;
  email: string | null;
  name: string | null;
}) => {
  return prisma.user.upsert({
    where: { firebaseUid: input.firebaseUid },
    create: {
      firebaseUid: input.firebaseUid,
      email: input.email,
      name: input.name,
    },
    update: {
      email: input.email,
      name: input.name,
    },
  });
};
