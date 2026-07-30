import { type AppUser, hasStatsAccess } from "@/entities/session";

export function canViewReleaseNotes(user: AppUser) {
  return hasStatsAccess(user);
}
