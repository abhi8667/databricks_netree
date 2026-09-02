import "server-only";
import { listRecords } from "@/lib/store/records";
import type { Invitation, NetreeUser } from "@/lib/types";

/**
 * Everything addressed to one faculty account.
 *
 * A request can reach a professor two ways: sent to their dataset identity
 * before they ever signed in, or redirected to them by a colleague. Both have
 * to land in the same inbox, so the lookup matches on either.
 */
export async function inboxFor(user: NetreeUser): Promise<Invitation[]> {
  const all = await listRecords<Invitation>("app_invitation");
  return all.filter((invitation) => {
    if (invitation.redirected_to_faculty_id) {
      // Once redirected, it belongs to the colleague it was passed to.
      return user.faculty_id !== null && invitation.redirected_to_faculty_id === user.faculty_id;
    }
    if (invitation.faculty_user_id) return invitation.faculty_user_id === user.user_id;
    return user.faculty_id !== null && invitation.faculty_id === user.faculty_id;
  });
}

export function canAct(user: NetreeUser, invitation: Invitation) {
  if (invitation.redirected_to_faculty_id) {
    return user.faculty_id !== null && invitation.redirected_to_faculty_id === user.faculty_id;
  }
  return (
    invitation.faculty_user_id === user.user_id ||
    (user.faculty_id !== null && invitation.faculty_id === user.faculty_id)
  );
}
