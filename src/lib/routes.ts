import type { NetreeUser } from "@/lib/types";

/** Where a signed-in account belongs. Onboarding first if the profile is bare. */
export function homeFor(user: NetreeUser) {
  if (!user.department) return "/onboarding";
  return user.role === "student" ? "/student" : user.role === "teacher" ? "/faculty" : "/alumni";
}
