import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Form } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { queryKeys } from "@/api/queryKeys";
import { expenseCategoriesApi, expensesApi } from "@/api/crm";
import { getApiErrorMessages } from "@/api/http";
import { useDraftFormState } from "@/features/drafts/useDraftFormState";
import { createOrQueueOffline } from "@/features/offline/createOrQueueOffline";
import { useCreatedReferenceOptions } from "@/features/reference-books/useCreatedReferenceOptions";
import { downloadBlob } from "@/utils/download";
import { isShortcutTarget, matchesPlainKey } from "@/utils/shortcuts";

export type ExpenseDraftValues = {
  description?: string;
  amount?: number;
  categoryId?: string;
};

const EXPENSE_CREATE_DRAFT_KEY = "draft:expenses:create";
const getDefaultExpensesDateRange = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

export function useExpensesPageController() {
  const {
    hasSavedDraft,
    replayKeyRef,
    loadDraftValues,
    withHydration,
    resetStoredDraft,
    saveDraftValues: saveDraftFormValues,
  } = useDraftFormState<ExpenseDraftValues>(EXPENSE_CREATE_DRAFT_KEY);
  const [page, setPage] = useState(1);
  const hasCreateDraft = hasSavedDraft;
  const [isOpen, setOpen] = useState(() => hasCreateDraft);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(() => getDefaultExpensesDateRange());
  const [form] = Form.useForm<ExpenseDraftValues>();
  const [isCategoryCreateOpen, setCategoryCreateOpen] = useState(false);
  const createdCategoryOptions = useCreatedReferenceOptions("expense-category");
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };

  const query = useQuery({
    queryKey: queryKeys.expenses.list(page, search, dateRange?.[0], dateRange?.[1]),
    queryFn: () =>
      expensesApi.list({
        page,
        page_size: 10,
        search: search.trim() || undefined,
        start: dateRange?.[0]?.startOf("day").toISOString(),
        end: dateRange?.[1]?.endOf("day").toISOString(),
      }),
  });

  const createMutation = useMutation({
    mutationFn: (values: ExpenseDraftValues) =>
      createOrQueueOffline({
        input: values as { description: string; amount: number; categoryId?: string },
        replayKey: replayKeyRef.current,
        create: (input) => expensesApi.create(input, { replayKey: replayKeyRef.current }),
        buildQueueItem: (input, replayKey) => ({
          kind: "expenses:create",
          replayKey,
          payload: input,
        }),
      }),
    onSuccess: async (result) => {
      message.success(result.offline ? "Расход сохранен локально" : "Расход создан");
      setOpen(false);
      resetStoredDraft(() => {
        form.resetFields();
      });
      if (!result.offline) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      }
    },
    onError: showErrors,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesApi.remove(id),
    onSuccess: async () => {
      message.success("Расход удален");
      await queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
    },
    onError: showErrors,
  });

  const exportMutation = useMutation({
    mutationFn: () =>
      expensesApi.export({
        search: search.trim() || undefined,
        start: dateRange?.[0]?.startOf("day").toISOString(),
        end: dateRange?.[1]?.endOf("day").toISOString(),
      }),
    onSuccess: (blob) => {
      downloadBlob(blob, `expenses_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`);
      message.success("Экспорт готов");
    },
    onError: showErrors,
  });

  const createCategoryMutation = useMutation({
    mutationFn: (values: { name: string }) => expenseCategoriesApi.create(values),
    onSuccess: async (result, values) => {
      message.success("Категория создана");
      createdCategoryOptions.addCreatedOption({ id: result.id, label: values.name.trim() });
      form.setFieldValue("categoryId", result.id);
      setCategoryCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.expenses.categories });
    },
    onError: showErrors,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const draftValues = loadDraftValues();
    withHydration(() => {
      form.setFieldsValue(draftValues ?? {});
    });
  }, [form, isOpen, loadDraftValues, withHydration]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isShortcutTarget(event.target)) {
        return;
      }

      if (matchesPlainKey(event, "a")) {
        event.preventDefault();
        setOpen(true);
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
  }, [exportMutation]);

  return {
    page,
    setPage,
    search,
    setSearch,
    dateRange,
    setDateRange,
    hasCreateDraft,
    isOpen,
    setOpen,
    form,
    query,
    modal,
    exportMutation,
    deleteMutation,
    createMutation,
    isCategoryCreateOpen,
    setCategoryCreateOpen,
    createCategoryMutation,
    createdCategoryOptions: createdCategoryOptions.createdOptions,
    resetFilters: () => {
      setSearch("");
      setDateRange(getDefaultExpensesDateRange());
      setPage(1);
    },
    handleClearCreateDraft: () => {
      resetStoredDraft(() => {
        form.resetFields();
      });
    },
    onCreateSubmit: (values: ExpenseDraftValues) => {
      createMutation.mutate(values);
    },
    onCreateValuesChange: (_: Partial<ExpenseDraftValues>, values: ExpenseDraftValues) => {
      saveDraftFormValues(values);
    },
    onCreateCategory: (values: { name: string }) => {
      createCategoryMutation.mutate(values);
    },
  };
}
