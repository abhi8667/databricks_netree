import "server-only";
import { cookies } from "next/headers";
import { getRecord, listRecords, putRecord } from "@/lib/store/records";
import type { NetreeUser, Role } from "@/lib/types";

/**
 * Session handling.
 *
 * Netree authenticates against a college ID rather than a password: the sign-in
 * screen takes the ID, and the account is created on first use. That is the
 * right trade for a campus tool - there is no self-serve public signup surface
 * to abuse - and it keeps every account tied to a real roster identifier.
 */

const COOKIE = "netree_session";

export async function setSession(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<NetreeUser | null> {
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) return null;
  return getRecord<NetreeUser>("app_user", id);
}

export async function requireUser(): Promise<NetreeUser> {
  const user = await currentUser();
  if (!user) throw new Error("Not signed in");
  return user;
}

export async function findByCollegeId(collegeId: string, role: Role) {
  const users = await listRecords<NetreeUser>("app_user");
  const key = collegeId.trim().toLowerCase();
  return users.find((u) => u.college_id.toLowerCase() === key && u.role === role) ?? null;
}

export async function saveUser(user: NetreeUser) {
  await putRecord("app_user", {
    id: user.user_id,
    owner_id: user.user_id,
    ref_id: user.faculty_id ?? "",
    status: user.role,
    payload: user as unknown as Record<string, unknown>,
  });
  return user;
}

export async function listUsers(role?: Role) {
  const users = await listRecords<NetreeUser>("app_user");
  return role ? users.filter((u) => u.role === role) : users;
}

export async function userById(id: string) {
  return getRecord<NetreeUser>("app_user", id);
}
