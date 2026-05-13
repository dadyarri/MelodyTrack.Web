import { DeleteOutlined, DownloadOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Button, DatePicker, Form, Input, InputNumber, Modal, Space, Typography } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import dayjs, { Dayjs } from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { paymentsApi } from "../api/crm";
import { getApiErrorMessages } from "../api/http";
import { ClientQuickCreateModal } from "../components/ClientQuickCreateModal";
import { DraftModalTitle } from "../components/DraftModalTitle";
import { ListFilters } from "../components/ListFilters";
import { ListTable } from "../components/ListTable";
import { ClientSelect, ServiceSelect } from "../components/RemoteSelect";
import { MoneyListSummaryCards } from "../components/MoneyListSummaryCards";
import { PageHeader } from "../components/PageHeader";
import { ShortcutButton } from "../components/ShortcutButton";
import { clearDraft, createReplayKey, loadDraft, saveDraft } from "../utils/drafts";
import { enqueueOfflineCreate, shouldQueueOfflineError } from "../utils/offlineQueue";
import { DATE_TIME_FORMAT, formatDateTime, TIME_FORMAT } from "../utils/date";
import { downloadBlob } from "../utils/download";
import { formatMoney } from "../utils/money";
import { isShortcutTarget, matchesPlainKey } from "../utils/shortcuts";

type PaymentPageLocationState = {
  openCreate?: boolean;
  clientId?: string;
};

export function PaymentsPage() {
  const [page, setPage] = useState(1);
  const hasCreateDraft = Boolean(loadDraft<PaymentDraftValues>(PAYMENT_CREATE_DRAFT_KEY));
  const [isOpen, setOpen] = useState(() => hasCreateDraft);
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState<string | undefined>();
  const [serviceId, setServiceId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [isQuickClientCreateOpen, setQuickClientCreateOpen] = useState(false);
  const [createdClientOptions, setCreatedClientOptions] = useState<DefaultOptionType[]>([]);
  const [createClientLabel, setCreateClientLabel] = useState<string | undefined>();
  const [createServiceLabel, setCreateServiceLabel] = useState<string | undefined>();
  const draftReplayKeyRef = useRef(loadDraft<PaymentDraftValues>(PAYMENT_CREATE_DRAFT_KEY)?.replayKey ?? createReplayKey());
  const isDraftHydratingRef = useRef(false);
  const [form] = Form.useForm();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const showErrors = (error: unknown) => getApiErrorMessages(error).forEach((errorMessage) => message.error(errorMessage));
  const locationState = (location.state ?? null) as PaymentPageLocationState | null;
  const createPrefillClientId = locationState?.openCreate ? locationState.clientId : undefined;
  const isCreateModalOpen = isOpen || Boolean(locationState?.openCreate);
  const query = useQuery({
    queryKey: ["payments", page, search, clientId, serviceId, dateRange?.[0]?.toISOString(), dateRange?.[1]?.toISOString()],
    queryFn: () => paymentsApi.list({
      page,
      page_size: 10,
      search: search.trim() || undefined,
      clientId,
      serviceId,
      start: dateRange?.[0]?.startOf("day").toISOString(),
      end: dateRange?.[1]?.endOf("day").toISOString(),
    }),
  });

  const createMutation = useMutation({
    mutationFn: async (values: { clientId: string; serviceId?: string; amount: number; date: dayjs.Dayjs; description?: string }) => {
      const input = { ...values, date: values.date.toISOString() };
      try {
        return { offline: false as const, response: await paymentsApi.create(input, { replayKey: draftReplayKeyRef.current }) };
      } catch (error) {
        if (!shouldQueueOfflineError(error)) {
          throw error;
        }

        enqueueOfflineCreate({
          kind: "payments:create",
          replayKey: draftReplayKeyRef.current,
          payload: { ...input, clientLabel: createClientLabel, serviceLabel: createServiceLabel },
        });
        return { offline: true as const, response: null };
      }
    },
    onSuccess: async (result) => {
      message.success(result.offline ? "Платеж сохранен локально" : "Платеж создан");
      closeCreateModal();
      clearDraft(PAYMENT_CREATE_DRAFT_KEY);
      draftReplayKeyRef.current = createReplayKey();
      if (!result.offline) {
        await queryClient.invalidateQueries({ queryKey: ["payments"] });
      }
    },
    onError: showErrors,
  });

  const deleteMutation = useMutation({
    mutationFn: paymentsApi.remove,
    onSuccess: async () => {
      message.success("Платеж удален");
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: showErrors,
  });

  const exportMutation = useMutation({
    mutationFn: () => paymentsApi.export({
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
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!isCreateModalOpen) {
      return;
    }

    const draft = loadDraft<PaymentDraftValues>(PAYMENT_CREATE_DRAFT_KEY);
    const draftValues = draft?.values ?? {};

    draftReplayKeyRef.current = draft?.replayKey ?? createReplayKey();
    pauseDraftHydration(isDraftHydratingRef, () => {
      form.setFieldsValue({
        clientId: draftValues.clientId ?? createPrefillClientId,
        serviceId: draftValues.serviceId,
        amount: draftValues.amount,
        date: draftValues.date ? dayjs(draftValues.date) : dayjs(),
        description: draftValues.description,
      });
    });
  }, [createPrefillClientId, form, isCreateModalOpen]);

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
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exportMutation, openCreateModal]);

  function clearCreateRouteState() {
    if (!location.state) {
      return;
    }

    navigate(location.pathname, { replace: true, state: null });
  }

  function closeCreateModal() {
    setOpen(false);
    pauseDraftHydration(isDraftHydratingRef, () => {
      form.setFieldsValue({
        clientId: undefined,
        serviceId: undefined,
        amount: undefined,
        date: dayjs(),
        description: undefined,
      });
    });
    clearCreateRouteState();
  }

  function handleClearCreateDraft() {
    clearDraft(PAYMENT_CREATE_DRAFT_KEY);
    draftReplayKeyRef.current = createReplayKey();
    pauseDraftHydration(isDraftHydratingRef, () => {
      form.setFieldsValue({
        clientId: createPrefillClientId,
        serviceId: undefined,
        amount: undefined,
        date: dayjs(),
        description: undefined,
      });
    });
  }

  return (
    <>
      <PageHeader
        title="Платежи"
        actions={
          <Space>
            <ShortcutButton shortcut="X" leadingIcon={<DownloadOutlined />} loading={exportMutation.isPending} label="Экспорт" onClick={() => exportMutation.mutate()} />
            <ShortcutButton shortcut="A" type="primary" leadingIcon={<PlusOutlined />} label="Добавить" onClick={openCreateModal} />
          </Space>
        }
      />
      <Space vertical size={16} className="wide">
        <ListFilters>
          <div className="filter-field filter-field-wide">
            <Typography.Text type="secondary">Поиск по клиенту, услуге или описанию</Typography.Text>
            <Input.Search
              allowClear
              placeholder="Введите имя клиента, услугу или текст описания"
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
          <div className="filter-field">
            <Typography.Text type="secondary">Клиент</Typography.Text>
            <ClientSelect value={clientId} onChange={(value) => { setClientId(value); setPage(1); }} />
          </div>
          <div className="filter-field filter-field-service">
            <Typography.Text type="secondary">Услуга</Typography.Text>
            <ServiceSelect value={serviceId} onChange={(value) => { setServiceId(value); setPage(1); }} />
          </div>
          <div className="filter-field">
            <Typography.Text type="secondary">Период</Typography.Text>
            <DatePicker.RangePicker
              value={dateRange}
              format={DATE_TIME_FORMAT}
              showTime={{ format: TIME_FORMAT }}
              onChange={(value) => {
                setDateRange(value);
                setPage(1);
              }}
            />
          </div>
          <div className="filter-field">
            <Typography.Text type="secondary">Действия</Typography.Text>
            <Button onClick={() => {
              setSearch("");
              setClientId(undefined);
              setServiceId(undefined);
              setDateRange(null);
              setPage(1);
            }}>
              Сбросить
            </Button>
          </div>
        </ListFilters>
        <MoneyListSummaryCards
          totalAmount={query.data?.summary.totalAmount}
          itemsCount={query.data?.summary.itemsCount}
          lastItemAtLabel={formatOptionalDateTime(query.data?.summary.lastItemAtUtc)}
          itemsTitle="Платежей найдено"
          lastItemTitle="Последний платеж"
        />
        <ListTable
          rowKey="id"
          loading={query.isLoading}
          dataSource={query.data?.data}
          pagination={{ current: page, pageSize: 10, total: query.data?.info.total, onChange: setPage }}
          columns={[
            { title: "Дата", dataIndex: "date", render: (value: string) => formatDateTime(value) },
            { title: "Клиент", render: (_, row) => `${row.client.lastName} ${row.client.firstName}` },
            { title: "Услуга", render: (_, row) => row.service?.name },
            { title: "Сумма", dataIndex: "amount", render: (value: number) => formatMoney(value) },
            { title: "Описание", dataIndex: "description" },
            { title: "", width: 72, render: (_, row) => <Button danger icon={<DeleteOutlined />} onClick={() => modal.confirm({ title: "Удалить платеж?", onOk: () => deleteMutation.mutate(row.id) })} /> },
          ]}
        />
      </Space>
      <Modal
        open={isCreateModalOpen}
        title={<DraftModalTitle title="Новый платеж" restored={hasCreateDraft && isCreateModalOpen} />}
        onCancel={closeCreateModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        destroyOnHidden
        footer={(_, { CancelBtn, OkBtn }) => (
          <>
            <Button onClick={handleClearCreateDraft}>Очистить черновик</Button>
            <CancelBtn />
            <OkBtn />
          </>
        )}
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{ date: dayjs() }}
          onFinish={(values) => createMutation.mutate(values)}
          onValuesChange={(_, values) => {
            if (isDraftHydratingRef.current) {
              return;
            }

            saveDraft<PaymentDraftValues>(PAYMENT_CREATE_DRAFT_KEY, {
              replayKey: draftReplayKeyRef.current,
              updatedAtUtc: new Date().toISOString(),
              values: {
                ...values,
                date: values.date ? values.date.toISOString() : undefined,
              },
            });
          }}
        >
          <Form.Item label="Клиент">
            <Space direction="vertical" size={8} className="wide">
              <Form.Item name="clientId" noStyle rules={[{ required: true }]}>
                <ClientSelect extraOptions={createdClientOptions} onResolvedLabelChange={setCreateClientLabel} />
              </Form.Item>
              <Button onClick={() => setQuickClientCreateOpen(true)}>Новый клиент</Button>
            </Space>
          </Form.Item>
          <Form.Item name="serviceId" label="Услуга">
            <ServiceSelect onResolvedLabelChange={setCreateServiceLabel} />
          </Form.Item>
          <Form.Item name="amount" label="Сумма" rules={[{ required: true }]}>
            <InputNumber min={0} className="wide" />
          </Form.Item>
          <Form.Item name="date" label="Дата" rules={[{ required: true }]}>
            <DatePicker showTime={{ format: TIME_FORMAT }} format={DATE_TIME_FORMAT} className="wide" />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
      <ClientQuickCreateModal
        open={isQuickClientCreateOpen}
        onCancel={() => setQuickClientCreateOpen(false)}
        onCreated={(client) => {
          setCreatedClientOptions((current) => [{ value: client.id, label: client.isOffline ? `${client.displayName} (локально)` : client.displayName }, ...current]);
          setCreateClientLabel(client.displayName);
          form.setFieldValue("clientId", client.id);
          setQuickClientCreateOpen(false);
        }}
      />
    </>
  );
}

function pauseDraftHydration(ref: { current: boolean }, action: () => void) {
  ref.current = true;
  action();
  queueMicrotask(() => {
    ref.current = false;
  });
}

type PaymentDraftValues = {
  clientId?: string;
  serviceId?: string;
  amount?: number;
  date?: string;
  description?: string;
};

const PAYMENT_CREATE_DRAFT_KEY = "draft:payments:create";

function formatOptionalDateTime(value?: string | null) {
  return value ? formatDateTime(value) : "Нет данных";
}
