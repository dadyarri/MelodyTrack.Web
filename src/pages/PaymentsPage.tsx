import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Button, DatePicker, Form, Input, InputNumber, Modal, Table } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { paymentsApi } from "../api/crm";
import { getApiErrorMessages } from "../api/http";
import { ClientSelect, ServiceSelect } from "../components/RemoteSelect";
import { PageHeader } from "../components/PageHeader";

export function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [isOpen, setOpen] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const showErrors = (error: unknown) => getApiErrorMessages(error).forEach((errorMessage) => message.error(errorMessage));
  const query = useQuery({ queryKey: ["payments", page], queryFn: () => paymentsApi.list({ page, page_size: 10 }) });

  const createMutation = useMutation({
    mutationFn: (values: { clientId: string; serviceId?: string; amount: number; date: dayjs.Dayjs; description: string }) =>
      paymentsApi.create({ ...values, date: values.date.toISOString() }),
    onSuccess: async () => {
      message.success("Платеж создан");
      setOpen(false);
      form.resetFields();
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

  return (
    <>
      <PageHeader title="Платежи" actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Добавить</Button>} />
      <Table
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data?.data}
        pagination={{ current: page, pageSize: 10, total: query.data?.info.total, onChange: setPage }}
        columns={[
          { title: "Дата", dataIndex: "date", render: (value: string) => dayjs(value).format("DD.MM.YYYY HH:mm") },
          { title: "Клиент", render: (_, row) => `${row.client.lastName} ${row.client.firstName}` },
          { title: "Услуга", render: (_, row) => row.service?.name },
          { title: "Сумма", dataIndex: "amount" },
          { title: "Описание", dataIndex: "description" },
          { title: "", width: 72, render: (_, row) => <Button danger icon={<DeleteOutlined />} onClick={() => modal.confirm({ title: "Удалить платеж?", onOk: () => deleteMutation.mutate(row.id) })} /> },
        ]}
      />
      <Modal open={isOpen} title="Новый платеж" onCancel={() => setOpen(false)} onOk={() => form.submit()} confirmLoading={createMutation.isPending}>
        <Form form={form} layout="vertical" requiredMark={false} initialValues={{ date: dayjs() }} onFinish={(values) => createMutation.mutate(values)}>
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
            <DatePicker showTime className="wide" />
          </Form.Item>
          <Form.Item name="description" label="Описание" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
