import type { QueryClient } from "@tanstack/react-query";

import { appointmentQueryKeys, appointmentsApi } from "@/entities/appointment";
import { analyticsQueryKeys, dashboardApi } from "@/entities/dashboard";

export { DashboardPage } from "./ui/DashboardPage";

export async function prefetchRouteData(queryClient: QueryClient) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: analyticsQueryKeys.stats(timezone),
      queryFn: () => dashboardApi.stats(timezone),
    }),
    queryClient.prefetchQuery({
      queryKey: appointmentQueryKeys.mini(timezone),
      queryFn: () => appointmentsApi.mini(timezone),
    }),
  ]);
}
