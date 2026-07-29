export const clientPortalQueryKeys = {
  all: ["portal"] as const,
  schedule: (clientId: string | null | undefined, startDateIso: string, endDateIso: string, timezone: string) =>
    ["portal", "schedule", clientId ?? null, startDateIso, endDateIso, timezone] as const,
  enrollments: (clientId: string | null | undefined) => ["portal", "course-enrollments", clientId ?? null] as const,
};
