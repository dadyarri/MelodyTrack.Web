import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Button, Card, DatePicker, Form, Input, InputNumber, Modal, Space, Table, Typography } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { paymentsApi } from "../api/crm";
import { getApiErrorMessages } from "../api/http";
import { ClientSelect, ServiceSelect } from "../components/RemoteSelect";
import { PageHeader } from "../components/PageHeader";
import { DATE_TIME_FORMAT, formatDateTime, TIME_FORMAT } from "../utils/date";
import { formatMoney } from "../utils/money";

const tableScrollY = 520;

type PaymentPageLocationState = {
  openCreate?: boolean;
  clientId?: string;
};

export function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [isOpen, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState<string | undefined>();
  const [serviceId, setServiceId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
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
    mutationFn: (values: { clientId: string; serviceId?: string; amount: number; date: dayjs.Dayjs; description?: string }) =>
      paymentsApi.create({ ...values, date: values.date.toISOString() }),
    onSuccess: async () => {
      message.success("Платеж создан");
      closeCreateModal();
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
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

  function openCreateModal() {
    form.setFieldsValue({
      clientId: undefined,
      serviceId: undefined,
      amount: undefined,
      date: dayjs(),
      description: undefined,
    });
    setOpen(true);
  }

  function clearCreateRouteState() {
    if (!location.state) {
      return;
    }

    navigate(location.pathname, { replace: true, state: null });
  }

  function closeCreateModal() {
    setOpen(false);
    form.setFieldsValue({
      clientId: undefined,
      serviceId: undefined,
      amount: undefined,
      date: dayjs(),
      description: undefined,
    });
    clearCreateRouteState();
  }

  return (
    <>
      <PageHeader title="Платежи" actions={<Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>Добавить</Button>} />
      <Space vertical size={16} className="wide">
        <div className="filters-stack">
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
        </div>
        <div className="summary-grid">
          <Card size="small">
            <Typography.Text type="secondary">Сумма по выборке</Typography.Text>
            <div className="summary-value">{formatMoney(query.data?.summary.totalAmount)}</div>
          </Card>
          <Card size="small">
            <Typography.Text type="secondary">Платежей найдено</Typography.Text>
            <div className="summary-value">{query.data?.summary.itemsCount ?? 0}</div>
          </Card>
          <Card size="small">
            <Typography.Text type="secondary">Последний платеж</Typography.Text>
            <div className="summary-caption">{formatOptionalDateTime(query.data?.summary.lastPaymentAtUtc)}</div>
          </Card>
        </div>
        <Table
          rowKey="id"
          loading={query.isLoading}
          dataSource={query.data?.data}
          pagination={{ current: page, pageSize: 10, total: query.data?.info.total, onChange: setPage }}
          scroll={{ x: "max-content", y: tableScrollY }}
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
        title="Новый платеж"
        onCancel={closeCreateModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        destroyOnHidden
        afterOpenChange={(open) => {
          if (!open || !createPrefillClientId) {
            return;
          }

          form.setFieldsValue({
            clientId: createPrefillClientId,
            date: form.getFieldValue("date") ?? dayjs(),
          });
        }}
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{ date: dayjs() }}
          onFinish={(values) => createMutation.mutate(values)}
        >
          <Form.Item name="clientId" label="Клиент" rules={[{ required: true }]}>
            <ClientSelect />
          </Form.Item>
          <Form.Item name="serviceId" label="Услуга">
            <ServiceSelect />
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
    </>
  );
}

function formatOptionalDateTime(value?: string | null) {
  return value ? formatDateTime(value) : "Нет данных";
}
