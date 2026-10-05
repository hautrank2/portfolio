import { compare } from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { getDb } from "~/lib/db";
import type { SessionModel } from "~/types";

const SESSION_COOKIE = "admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60 * 1000;

// Compared against when the username does not exist, so a miss costs the same
// bcrypt round as a wrong password and cannot be told apart by timing. It is
// the hash of a discarded random string, not of any real password.
const DUMMY_HASH =
  "$2b$12$jIu/m8lQPvh.VrYzXO5zMuknRYXog88dZPiniO5xqZNbwYTyw/R/2";

type UserDoc = {
  username: string;
  passwordHash: string;
  role: "admin";
  failedLogins?: number;
  lockedUntil?: Date | null;
};

export type LoginResult =
  | { ok: true; session: SessionModel }
  | { ok: false; reason: "invalid" | "locked" };

const getSecret = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET is not set (need at least 32 characters).");
  }
  return new TextEncoder().encode(secret);
};

export const verifyLogin = async (
  username: string,
  password: string
): Promise<LoginResult> => {
  const db = await getDb();
  const users = db.collection<UserDoc>("users");
  const user = await users.findOne({ username });

  if (!user) {
    await compare(password, DUMMY_HASH);
    return { ok: false, reason: "invalid" };
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    return { ok: false, reason: "locked" };
  }

  if (!(await compare(password, user.passwordHash))) {
    const failedLogins = (user.failedLogins ?? 0) + 1;
    const locked = failedLogins >= MAX_FAILED_LOGINS;
    await users.updateOne(
      { username },
      {
        $set: {
          failedLogins: locked ? 0 : failedLogins,
          lockedUntil: locked ? new Date(Date.now() + LOCK_MS) : null,
        },
      }
    );
    return { ok: false, reason: locked ? "locked" : "invalid" };
  }

  await users.updateOne(
    { username },
    { $set: { failedLogins: 0, lockedUntil: null } }
  );
  return { ok: true, session: { username: user.username, role: user.role } };
};

export const createSession = async (session: SessionModel) => {
  const token = await new SignJWT({ role: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.username)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
};

export const clearSession = async () => {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
};

export const getSession = async (): Promise<SessionModel | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    if (!payload.sub || payload.role !== "admin") return null;
    return { username: payload.sub, role: "admin" };
  } catch {
    // Expired, tampered with, or signed by an old secret — all mean signed out.
    return null;
  }
};
