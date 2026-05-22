import { DeleteOutlined, DownloadOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Button, DatePicker, Form, Input, InputNumber, Modal, Space, Typography } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useRef, useState } from "react";
import { expenseCategoriesApi, expensesApi } from "@/api/crm";
import { ExpenseCategorySelect } from "@/components/RemoteSelect";
import { ReferenceBookCreateModal } from "@/components/ReferenceBookCreateModal";
import { getApiErrorMessages } from "@/api/http";
import { DraftModalFooter, DraftModalTitle, ListFilters, ListTable, PageLayout, ShortcutButton } from "@/shared/ui";
import { MoneyListSummaryCards } from "@/components/MoneyListSummaryCards";
import { filterFieldClassName, filterFieldWideClassName } from "@/shared/ui/filterFieldStyles";
import { DATE_FORMAT, formatDateTime } from "@/utils/date";
import { downloadBlob } from "@/utils/download";
import { getDraftReplayKey, hasDraft, loadDraft, resetDraft, saveDraftValues, withDraftHydration } from "@/utils/drafts";
import { formatMoney } from "@/utils/money";
import { enqueueOfflineCreate, shouldQueueOfflineError } from "@/utils/offlineQueue";
import { isShortcutTarget, matchesPlainKey } from "@/utils/shortcuts";

type ExpenseDraftValues = {
  description?: string;
  amount?: number;
  categoryId?: string;
};

const EXPENSE_CREATE_DRAFT_KEY = "draft:expenses:create";

export function ExpensesPage() {
  const [page, setPage] = useState(1);
  const hasCreateDraft = hasDraft(EXPENSE_CREATE_DRAFT_KEY);
  const [isOpen, setOpen] = useState(() => hasCreateDraft);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const draftReplayKeyRef = useRef(getDraftReplayKey(EXPENSE_CREATE_DRAFT_KEY));
  const isDraftHydratingRef = useRef(false);
  const [form] = Form.useForm<ExpenseDraftValues>();
  const [isCategoryCreateOpen, setCategoryCreateOpen] = useState(false);
  const [createdCategoryOptions, setCreatedCategoryOptions] = useState<DefaultOptionType[]>([]);
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };
  const query = useQuery({
    queryKey: ["expenses", page, search, dateRange?.[0]?.toISOString(), dateRange?.[1]?.toISOString()],
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
    mutationFn: async (values: ExpenseDraftValues) => {
      const input = values as { description: string; amount: number; categoryId?: string };
      try {
        return { offline: false as const, response: await expensesApi.create(input, { replayKey: draftReplayKeyRef.current }) };
      } catch (error) {
        if (!shouldQueueOfflineError(error)) {
          throw error;
        }

        enqueueOfflineCreate({
          kind: "expenses:create",
          replayKey: draftReplayKeyRef.current,
          payload: input,
        });
        return { offline: true as const, response: null };
      }
    },
    onSuccess: async (result) => {
      message.success(result.offline ? "Расход сохранен локально" : "Расход создан");
      setOpen(false);
      resetDraft(EXPENSE_CREATE_DRAFT_KEY, draftReplayKeyRef);
      withDraftHydration(isDraftHydratingRef, () => {
        form.resetFields();
      });
      if (!result.offline) {
        await queryClient.invalidateQueries({ queryKey: ["expenses"] });
      }
    },
    onError: showErrors,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return expensesApi.remove(id);
    },
    onSuccess: async () => {
      message.success("Расход удален");
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
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
      const option = { value: result.id, label: values.name.trim() } satisfies DefaultOptionType;
      setCreatedCategoryOptions((current) => [option, ...current.filter((item) => item.value !== option.value)]);
      form.setFieldValue("categoryId", result.id);
      setCategoryCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
    },
    onError: showErrors,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const draft = loadDraft<ExpenseDraftValues>(EXPENSE_CREATE_DRAFT_KEY);
    draftReplayKeyRef.current = draft?.replayKey ?? getDraftReplayKey(EXPENSE_CREATE_DRAFT_KEY);
    withDraftHydration(isDraftHydratingRef, () => {
      form.setFieldsValue(draft?.values ?? {});
    });
  }, [form, isOpen]);

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

  function handleClearCreateDraft() {
    resetDraft(EXPENSE_CREATE_DRAFT_KEY, draftReplayKeyRef);
    withDraftHydration(isDraftHydratingRef, () => {
      form.resetFields();
    });
  }

  return (
    <PageLayout
      title="Расходы"
      actions={
        <Space data-onboarding-id="expenses-actions">
          <ShortcutButton
            shortcut="X"
            leadingIcon={<DownloadOutlined />}
            loading={exportMutation.isPending}
            label="Экспорт"
            onClick={() => {
              exportMutation.mutate();
            }}
          />
          <ShortcutButton
            shortcut="A"
            type="primary"
            leadingIcon={<PlusOutlined />}
            label="Добавить"
            onClick={() => {
              setOpen(true);
            }}
          />
        </Space>
      }
    >
      <div data-onboarding-id="expenses-filters">
        <ListFilters>
          <div className={filterFieldWideClassName}>
            <Typography.Text type="secondary">Поиск по описанию расхода</Typography.Text>
            <Input.Search
              allowClear
              placeholder="Введите часть описания или название статьи"
              onSearch={(value) => {
                setSearch(value);
                setPage(1);
              }}
              onChange={(event) => {
                if (!event.target.value) {
                  setSearch("");
                  setPage(1);
                }
              }}
            />
          </div>
          <div className={filterFieldClassName}>
            <Typography.Text type="secondary">Период</Typography.Text>
            <DatePicker.RangePicker
              value={dateRange}
              format={DATE_FORMAT}
              onChange={(value) => {
                setDateRange(value);
                setPage(1);
              }}
            />
          </div>
          <div className={filterFieldClassName}>
            <Typography.Text type="secondary">Действия</Typography.Text>
            <Button
              onClick={() => {
                setSearch("");
                setDateRange(null);
                setPage(1);
              }}
            >
              Сбросить
            </Button>
          </div>
        </ListFilters>
      </div>
      <Space orientation="vertical" size={20} className="wide" data-onboarding-id="expenses-summary">
        <MoneyListSummaryCards
          totalAmount={query.data?.summary.totalAmount}
          itemsCount={query.data?.summary.itemsCount}
          lastItemAtLabel={formatOptionalDateTime(query.data?.summary.lastItemAtUtc)}
          itemsTitle="Расходов найдено"
          lastItemTitle="Последний расход"
        />
        <ListTable
          rowKey="id"
          loading={query.isLoading}
          dataSource={query.data?.data}
          pagination={{ current: page, pageSize: 10, total: query.data?.info.total, onChange: setPage }}
          columns={[
            { title: "Дата", dataIndex: "date", render: (value: string) => formatDateTime(value) },
            { title: "Описание", dataIndex: "description" },
            { title: "Категория", dataIndex: "categoryName", render: (value?: string | null) => value || "Без категории" },
            { title: "Сумма", dataIndex: "amount", render: (value: number) => formatMoney(value) },
            {
              title: "",
              width: 72,
              render: (_, row) => (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() =>
                    modal.confirm({
                      title: "Удалить расход?",
                      onOk: () => {
                        deleteMutation.mutate(row.id);
                      },
                    })
                  }
                />
              ),
            },
          ]}
        />
      </Space>
      <Modal
        open={isOpen}
        title={<DraftModalTitle title="Новый расход" restored={hasCreateDraft && isOpen} />}
        onCancel={() => {
          setOpen(false);
        }}
        onOk={() => {
          form.submit();
        }}
        confirmLoading={createMutation.isPending}
        footer={(_, { CancelBtn, OkBtn }) => <DraftModalFooter onClearDraft={handleClearCreateDraft} CancelBtn={CancelBtn} OkBtn={OkBtn} />}
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => {
            createMutation.mutate(values);
          }}
          onValuesChange={(_, values) => {
            if (isDraftHydratingRef.current) {
              return;
            }

            saveDraftValues(EXPENSE_CREATE_DRAFT_KEY, draftReplayKeyRef.current, values);
          }}
        >
          <Form.Item label="Категория">
            <Space.Compact className="wide">
              <Form.Item name="categoryId" noStyle>
                <ExpenseCategorySelect extraOptions={createdCategoryOptions} />
              </Form.Item>
              <Button
                onClick={() => {
                  setCategoryCreateOpen(true);
                }}
              >
                Новая категория
              </Button>
            </Space.Compact>
          </Form.Item>
          <Form.Item name="description" label="Описание" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="amount" label="Сумма" rules={[{ required: true }]}>
            <InputNumber min={0} className="wide" />
          </Form.Item>
        </Form>
      </Modal>
      <ReferenceBookCreateModal
        open={isCategoryCreateOpen}
        title="Новая категория расхода"
        confirmLoading={createCategoryMutation.isPending}
        onCancel={() => {
          setCategoryCreateOpen(false);
        }}
        onSubmit={(values) => {
          createCategoryMutation.mutate(values);
        }}
      />
    </PageLayout>
  );
}

function formatOptionalDateTime(value?: string | null) {
  return value ? formatDateTime(value) : "Нет данных";
}
