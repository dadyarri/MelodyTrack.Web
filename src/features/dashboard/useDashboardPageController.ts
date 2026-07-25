import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { queryKeys } from "@/api/queryKeys";
import { dashboardApi } from "@/api/crm";
import { appointmentQueryKeys, appointmentsApi, type Appointment } from "@/entities/appointment";
import { clientQueryKeys, clientsApi, type Client } from "@/entities/client";
import { hasAdminAccess } from "@/features/auth/access";
import { useAuth } from "@/features/auth/useAuth";
import { getClientHistoryActions } from "@/features/clients/clientHistoryActions";
import { downloadBlob } from "@/shared/lib";
import { isShortcutTarget, matchesPlainKey } from "@/shared/lib";

const clientHistoryEventsPageSize = 8;

export function useDashboardPageController() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [historyEventsPage, setHistoryEventsPage] = useState(1);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const canSeeFinancialOverview = hasAdminAccess(auth.user);

  const statsQuery = useQuery({
    queryKey: queryKeys.dashboard.stats(timezone),
    queryFn: () => dashboardApi.stats(timezone),
  });
  const debtorsQuery = useQuery({
    queryKey: clientQueryKeys.debtors,
    queryFn: () => clientsApi.debtors(),
    enabled: canSeeFinancialOverview,
  });
  const miniQuery = useQuery({
    queryKey: appointmentQueryKeys.mini(timezone),
    queryFn: () => appointmentsApi.mini(timezone),
  });
  const historyQuery = useQuery({
    queryKey: clientQueryKeys.history(historyClient?.id, historyEventsPage, clientHistoryEventsPageSize),
    queryFn: () => {
      const clientId = historyClient?.id;
      if (!clientId) {
        throw new Error("History client is not selected.");
      }
      return clientsApi.history(clientId, {
        page: historyEventsPage,
        page_size: clientHistoryEventsPageSize,
      });
    },
    enabled: Boolean(historyClient),
    placeholderData: keepPreviousData,
  });
  const debtorsExportMutation = useMutation({
    mutationFn: () => clientsApi.exportDebtors(),
    onSuccess: (blob) => {
      downloadBlob(blob, `debtors_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`);
    },
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isShortcutTarget(event.target)) {
        return;
      }

      if (!matchesPlainKey(event, "x") || !canSeeFinancialOverview) {
        return;
      }

      event.preventDefault();
      debtorsExportMutation.mutate();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canSeeFinancialOverview, debtorsExportMutation]);

  const today = dayjs();
  const tomorrow = today.add(1, "day");
  const todayAppointments = miniQuery.data?.[today.format("YYYY-MM-DD")] ?? [];
  const tomorrowAppointments = miniQuery.data?.[tomorrow.format("YYYY-MM-DD")] ?? [];
  const clientHistoryActions = useMemo(() => getClientHistoryActions(auth.user, navigate), [auth.user, navigate]);

  const openHistoryClient = (client: Client) => {
    setHistoryEventsPage(1);
    setHistoryClient(client);
  };

  const closeHistoryClient = () => {
    setHistoryClient(null);
    setHistoryEventsPage(1);
  };

  return {
    auth,
    canSeeFinancialOverview,
    historyClient,
    historyEventsPage,
    setHistoryEventsPage,
    setHistoryClient: openHistoryClient,
    closeHistoryClient,
    statsQuery,
    debtorsQuery,
    miniQuery,
    historyQuery,
    debtorsExportMutation,
    today,
    tomorrow,
    todayAppointments,
    tomorrowAppointments,
    clientHistoryActions,
  };
}

export type DashboardReminderListProps = {
  appointments: Appointment[];
  emptyDescription: string;
  showTimeOnly?: boolean;
};
