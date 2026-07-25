import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Form } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import * as v from "valibot";

import { expenseQueryKeys, expensesApi } from "@/entities/expense";
import { createOrQueueOffline } from "@/entities/offline-queue";
import { expenseCategoriesApi, referenceBookQueryKeys } from "@/entities/reference-book";
import { hasSuperuserAccess, useAuth } from "@/entities/session";
import { getApiErrorMessages } from "@/shared/api";
import { useCreatedReferenceOptions } from "@/shared/lib";
import { downloadBlob } from "@/shared/lib";
import { isShortcutTarget, matchesPlainKey } from "@/shared/lib";
import { handleStaleEntityConflict } from "@/shared/lib";
import { readPositiveInteger, useDraftFormState, useUrlState } from "@/shared/lib/react";

export type ExpenseFormValues = {
  description?: string;
  amount?: number;
  date?: Dayjs;
  categoryId?: string;
};

type ExpenseDraftValues = Omit<ExpenseFormValues, "date"> & { date?: string };

const EXPENSE_CREATE_DRAFT_KEY = "draft:expenses:create";
const expenseDraftSchema = v.object({
  description: v.optional(v.string()),
  amount: v.optional(v.number()),
  date: v.optional(v.string()),
  categoryId: v.optional(v.string()),
});
const isExpenseDraft = (value: unknown): value is ExpenseDraftValues => v.safeParse(expenseDraftSchema, value).success;
const getDefaultExpensesDateRange = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

export function useExpensesPageController() {
  const { searchParams, setUrlState } = useUrlState();
  const {
    hasSavedDraft,
    replayKeyRef,
    loadDraftValues,
    withHydration,
    resetStoredDraft,
    saveDraftValues: saveDraftFormValues,
  } = useDraftFormState<ExpenseDraftValues>(EXPENSE_CREATE_DRAFT_KEY, isExpenseDraft);
  const page = readPositiveInteger(searchParams.get("page"));
  const setPage = (nextPage: number) => {
    setUrlState({ page: nextPage === 1 ? null : nextPage });
  };
  const hasCreateDraft = hasSavedDraft;
  const [isCreateRequestedOpen, setOpen] = useState(false);
  const isOpen = isCreateRequestedOpen || hasCreateDraft;
  const search = searchParams.get("q") ?? "";
  const setSearch = (value: string) => {
    setUrlState({ page: null, q: value.trim() || null });
  };
  const dateRange = readExpenseDateRange(searchParams);
  const setDateRange = (value: [Dayjs | null, Dayjs | null] | null) => {
    setUrlState({
      page: null,
      period: value ? null : "all",
      from: value?.[0]?.format("YYYY-MM-DD"),
      to: value?.[1]?.format("YYYY-MM-DD"),
    });
  };
  const [form] = Form.useForm<ExpenseFormValues>();
  const [editForm] = Form.useForm<ExpenseFormValues>();
  const [editingExpense, setEditingExpense] = useState<{ id: string; expectedActivityId?: string } | null>(null);
  const [isCategoryCreateOpen, setCategoryCreateOpen] = useState(false);
  const createdCategoryOptions = useCreatedReferenceOptions("expense-category");
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const auth = useAuth();
  const canEditExpenses = hasSuperuserAccess(auth.user);
  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };

  const query = useQuery({
    queryKey: expenseQueryKeys.list(page, search, dateRange?.[0], dateRange?.[1]),
    queryFn: () =>
      expensesApi.list({
        page,
        page_size: 10,
        search: search.trim() || undefined,
        start: dateRange?.[0]?.startOf("day").toISOString(),
        end: dateRange?.[1]?.endOf("day").toISOString(),
      }),
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (values: ExpenseFormValues) =>
      createOrQueueOffline({
        input: toExpenseRequest(values),
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
        await queryClient.invalidateQueries({ queryKey: expenseQueryKeys.all });
      }
    },
    onError: showErrors,
  });

  const editMutation = useMutation({
    mutationFn: ({ id, expectedActivityId, values }: { id: string; expectedActivityId?: string; values: ExpenseFormValues }) =>
      expensesApi.update(id, toExpenseRequest(values), { expectedActivityId }),
    onSuccess: async () => {
      message.success("Расход изменен");
      setEditingExpense(null);
      editForm.resetFields();
      await queryClient.invalidateQueries({ queryKey: expenseQueryKeys.all });
    },
    onError: async (error, variables) => {
      await handleStaleEntityConflict({
        error,
        modal,
        queryClient,
        invalidateQueryKey: expenseQueryKeys.all,
        showErrors,
        title: "Расход уже изменен",
        okText: "Сохранить все равно",
        cancelText: "Обновить список",
        onConfirm: (conflict) => {
          editMutation.mutate({ ...variables, expectedActivityId: conflict.currentActivity?.id });
        },
        onReload: () => {
          void queryClient.invalidateQueries({ queryKey: expenseQueryKeys.all });
        },
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, expectedActivityId }: { id: string; expectedActivityId?: string }) => expensesApi.remove(id, { expectedActivityId }),
    onSuccess: async () => {
      message.success("Расход удален");
      await queryClient.invalidateQueries({ queryKey: expenseQueryKeys.all });
    },
    onError: async (error, variables) => {
      await handleStaleEntityConflict({
        error,
        modal,
        queryClient,
        invalidateQueryKey: expenseQueryKeys.all,
        showErrors,
        title: "Расход уже изменен",
        okText: "Удалить все равно",
        cancelText: "Обновить список",
        onConfirm: (conflict) => {
          deleteMutation.mutate({ id: variables.id, expectedActivityId: conflict.currentActivity?.id });
        },
        onReload: () => {
          void queryClient.invalidateQueries({ queryKey: expenseQueryKeys.all });
        },
      });
    },
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
  const exportExpenses = exportMutation.mutate;

  const createCategoryMutation = useMutation({
    mutationFn: (values: { name: string }) => expenseCategoriesApi.create(values),
    onSuccess: async (result, values) => {
      message.success("Категория создана");
      createdCategoryOptions.addCreatedOption({ id: result.id, label: values.name.trim() });
      form.setFieldValue("categoryId", result.id);
      setCategoryCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: referenceBookQueryKeys.expenseCategories });
    },
    onError: showErrors,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const draftValues = loadDraftValues();
    withHydration(() => {
      form.setFieldsValue({
        ...draftValues,
        date: draftValues?.date ? dayjs(draftValues.date) : dayjs(),
      });
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
        exportExpenses();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [exportExpenses]);

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
    editForm,
    query,
    modal,
    exportMutation,
    deleteMutation,
    createMutation,
    editMutation,
    canEditExpenses,
    editingExpense,
    isCategoryCreateOpen,
    setCategoryCreateOpen,
    createCategoryMutation,
    createdCategoryOptions: createdCategoryOptions.createdOptions,
    resetFilters: () => {
      setUrlState({ page: null, q: null, period: null, from: null, to: null });
    },
    handleClearCreateDraft: () => {
      resetStoredDraft(() => {
        form.resetFields();
      });
    },
    openEdit: (expense: {
      id: string;
      description: string;
      amount: number;
      date: string;
      categoryId?: string | null;
      lastActivity?: { id: string } | null;
    }) => {
      editForm.setFieldsValue({
        description: expense.description,
        amount: expense.amount,
        date: dayjs(expense.date),
        categoryId: expense.categoryId ?? undefined,
      });
      setEditingExpense({ id: expense.id, expectedActivityId: expense.lastActivity?.id });
    },
    closeEdit: () => {
      setEditingExpense(null);
      editForm.resetFields();
    },
    onCreateSubmit: (values: ExpenseFormValues) => {
      createMutation.mutate(values);
    },
    onEditSubmit: (values: ExpenseFormValues) => {
      if (editingExpense) {
        editMutation.mutate({ ...editingExpense, values });
      }
    },
    onCreateValuesChange: (_: Partial<ExpenseFormValues>, values: ExpenseFormValues) => {
      saveDraftFormValues({
        ...values,
        date: values.date?.toISOString(),
      });
    },
    onCreateCategory: (values: { name: string }) => {
      createCategoryMutation.mutate(values);
    },
  };
}

function readExpenseDateRange(searchParams: URLSearchParams): [Dayjs | null, Dayjs | null] | null {
  if (searchParams.get("period") === "all") {
    return null;
  }
  const from = dayjs(searchParams.get("from") ?? "");
  const to = dayjs(searchParams.get("to") ?? "");
  return from.isValid() && to.isValid() ? [from, to] : getDefaultExpensesDateRange();
}

function toExpenseRequest(values: ExpenseFormValues) {
  if (!values.description || values.amount == null || !values.date) {
    throw new Error("Заполните обязательные поля расхода.");
  }

  return {
    description: values.description,
    amount: values.amount,
    date: values.date.startOf("day").toISOString(),
    categoryId: values.categoryId,
  };
}
