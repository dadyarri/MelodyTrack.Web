import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Button, Card, DatePicker, Form, Input, InputNumber, Modal, Space, Table, Typography } from "antd";
import type { Dayjs } from "dayjs";
import { useState } from "react";
import { expensesApi } from "../api/crm";
import { getApiErrorMessages } from "../api/http";
import { PageHeader } from "../components/PageHeader";
import { DATE_FORMAT, formatDateTime } from "../utils/date";
import { formatMoney } from "../utils/money";

const tableScrollY = 520;

export function ExpensesPage() {
  const [page, setPage] = useState(1);
  const [isOpen, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const showErrors = (error: unknown) => getApiErrorMessages(error).forEach((errorMessage) => message.error(errorMessage));
  const query = useQuery({
    queryKey: ["expenses", page, search, dateRange?.[0]?.toISOString(), dateRange?.[1]?.toISOString()],
    queryFn: () => expensesApi.list({
      page,
      page_size: 10,
      search: search.trim() || undefined,
      start: dateRange?.[0]?.startOf("day").toISOString(),
      end: dateRange?.[1]?.endOf("day").toISOString(),
    }),
  });

  const createMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: async () => {
      message.success("Расход создан");
      setOpen(false);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: showErrors,
  });

  const deleteMutation = useMutation({
    mutationFn: expensesApi.remove,
    onSuccess: async () => {
      message.success("Расход удален");
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: showErrors,
  });

  return (
    <>
      <PageHeader title="Расходы" actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Добавить</Button>} />
      <Space direction="vertical" size={16} className="wide">
        <div className="filters-stack">
            <div className="filter-field filter-field-wide">
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
            <div className="filter-field">
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
            <div className="filter-field">
              <Typography.Text type="secondary">Действия</Typography.Text>
              <Button onClick={() => {
                setSearch("");
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
            <Typography.Text type="secondary">Расходов найдено</Typography.Text>
            <div className="summary-value">{query.data?.summary.itemsCount ?? 0}</div>
          </Card>
          <Card size="small">
            <Typography.Text type="secondary">Последний расход</Typography.Text>
            <div className="summary-caption">{formatOptionalDateTime(query.data?.summary.lastExpenseAtUtc)}</div>
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
            { title: "Описание", dataIndex: "description" },
            { title: "Сумма", dataIndex: "amount", render: (value: number) => formatMoney(value) },
            { title: "", width: 72, render: (_, row) => <Button danger icon={<DeleteOutlined />} onClick={() => modal.confirm({ title: "Удалить расход?", onOk: () => deleteMutation.mutate(row.id) })} /> },
          ]}
        />
      </Space>
      <Modal open={isOpen} title="Новый расход" onCancel={() => setOpen(false)} onOk={() => form.submit()} confirmLoading={createMutation.isPending}>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="description" label="Описание" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="amount" label="Сумма" rules={[{ required: true }]}>
            <InputNumber min={0} className="wide" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function formatOptionalDateTime(value?: string | null) {
  return value ? formatDateTime(value) : "Нет данных";
}
