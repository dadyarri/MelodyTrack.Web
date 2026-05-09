import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Button, Form, Input, InputNumber, Modal, Table } from "antd";
import { useState } from "react";
import { expensesApi } from "../api/crm";
import { getApiErrorMessages } from "../api/http";
import { PageHeader } from "../components/PageHeader";
import { formatDateTime } from "../utils/date";
import { formatMoney } from "../utils/money";

export function ExpensesPage() {
  const [page, setPage] = useState(1);
  const [isOpen, setOpen] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const showErrors = (error: unknown) => getApiErrorMessages(error).forEach((errorMessage) => message.error(errorMessage));
  const query = useQuery({ queryKey: ["expenses", page], queryFn: () => expensesApi.list({ page, page_size: 10 }) });

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
      <Table
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data?.data}
        pagination={{ current: page, pageSize: 10, total: query.data?.info.total, onChange: setPage }}
        scroll={{ x: "max-content" }}
        columns={[
          { title: "Дата", dataIndex: "date", render: (value: string) => formatDateTime(value) },
          { title: "Описание", dataIndex: "description" },
          { title: "Сумма", dataIndex: "amount", render: (value: number) => formatMoney(value) },
          { title: "", width: 72, render: (_, row) => <Button danger icon={<DeleteOutlined />} onClick={() => modal.confirm({ title: "Удалить расход?", onOk: () => deleteMutation.mutate(row.id) })} /> },
        ]}
      />
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
