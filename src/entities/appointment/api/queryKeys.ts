export const appointmentQueryKeys = {
  all: ["schedule"] as const,
  appointmentsAll: ["schedule", "appointments"] as const,
  appointments: (startDateIso: string, endDateIso: string) => ["schedule", "appointments", startDateIso, endDateIso] as const,
  recurrenceTypes: ["schedule", "recurrenceTypes"] as const,
  mini: (timezone: string) => ["schedule", "mini", timezone] as const,
};
