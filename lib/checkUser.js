import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";

export const checkUser = async () => {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  try {
    const loggedInUser = await db.user.findUnique({
      where: {
        clerkUserId: user.id,
      },
    });

    if (loggedInUser) {
      return loggedInUser;
    }

    const name = `${user.firstName} ${user.lastName}`;

    const newUser = await db.user.create({
      data: {
        clerkUserId: user.id,
        name,
        imageUrl: user.imageUrl,
        email: user.emailAddresses[0].emailAddress,
      },
    });

    return newUser;
  } catch (error) {
    console.log(error.message);
  }
};

/**
 * Resolves the signed-in Clerk user to our db User record, or null if
 * signed out or not yet synced to the db.
 */
export const getDbUser = async () => {
  const { userId } = await auth();
  if (!userId) return null;

  return db.user.findUnique({
    where: { clerkUserId: userId },
  });
};

/**
 * Resolves the signed-in user and throws unless they hold the ADMIN role.
 * Use in server actions that should reject non-admins outright.
 */
export const requireAdmin = async () => {
  const user = await getDbUser();

  if (!user || user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  return user;
};
