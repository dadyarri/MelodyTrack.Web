import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { queryKeys } from "@/api/queryKeys";
import { paymentsApi } from "@/api/crm";
import { getApiErrorMessages } from "@/api/http";
import { usePaymentCreateController } from "@/features/payments/usePaymentCreateController";
import { formatDateTime } from "@/utils/date";
import { downloadBlob } from "@/utils/download";
import { isShortcutTarget, matchesPlainKey } from "@/utils/shortcuts";
import { handleStaleEntityConflict } from "@/utils/staleEntity";

const getDefaultPaymentsDateRange = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

export function usePaymentsPageController() {
  const paymentCreate = usePaymentCreateController({ useRouteIntent: true });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState<string | undefined>();
  const [serviceId, setServiceId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(() => getDefaultPaymentsDateRange());
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };
  const listQueryKey = queryKeys.payments.list(page, search, clientId, serviceId, dateRange?.[0], dateRange?.[1]);

  const query = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      paymentsApi.list({
        page,
        page_size: 10,
        search: search.trim() || undefined,
        clientId,
        serviceId,
        start: dateRange?.[0]?.startOf("day").toISOString(),
        end: dateRange?.[1]?.endOf("day").toISOString(),
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, expectedActivityId }: { id: string; expectedActivityId?: string }) => {
      return paymentsApi.remove(id, { expectedActivityId });
    },
    onSuccess: async () => {
      message.success("Платеж удален");
      await queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
    onError: async (error, variables) => {
      await handleStaleEntityConflict({
        error,
        modal,
        queryClient,
        invalidateQueryKey: queryKeys.payments.all,
        showErrors,
        title: "Платеж уже изменен",
        okText: "Удалить все равно",
        cancelText: "Обновить список",
        onConfirm: (conflict) => {
          deleteMutation.mutate({ id: variables.id, expectedActivityId: conflict.currentActivity?.id });
        },
        onReload: () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
        },
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: () =>
      paymentsApi.export({
        search: search.trim() || undefined,
        clientId,
        serviceId,
        start: dateRange?.[0]?.startOf("day").toISOString(),
        end: dateRange?.[1]?.endOf("day").toISOString(),
      }),
    onSuccess: (blob) => {
      downloadBlob(blob, `payments_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`);
      message.success("Экспорт готов");
    },
    onError: showErrors,
  });

  const openCreateModal = useCallback(() => {
    paymentCreate.openCreateModal();
  }, [paymentCreate]);

  const resetFilters = useCallback(() => {
    setSearch("");
    setClientId(undefined);
    setServiceId(undefined);
    setDateRange(getDefaultPaymentsDateRange());
    setPage(1);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isShortcutTarget(event.target)) {
        return;
      }

      if (matchesPlainKey(event, "a")) {
        event.preventDefault();
        openCreateModal();
        return;
      }

      if (matchesPlainKey(event, "x")) {
        event.preventDefault();
        exportMutation.mutate();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [exportMutation, openCreateModal]);

  return {
    page,
    setPage,
    search,
    setSearch,
    clientId,
    setClientId,
    serviceId,
    setServiceId,
    dateRange,
    setDateRange,
    query,
    deleteMutation,
    exportMutation,
    resetFilters,
    ...paymentCreate,
    openCreateModal,
  };
}

export function formatOptionalDateTime(value?: string | null) {
  return value ? formatDateTime(value) : "Нет данных";
}
