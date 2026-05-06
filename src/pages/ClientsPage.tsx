import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Button, Form, Input, Modal, Space, Table } from "antd";
import { useState } from "react";
import { clientsApi } from "../api/crm";
import { Client } from "../api/types";
import { getApiErrorMessages } from "../api/http";
import { PageHeader } from "../components/PageHeader";

export function ClientsPage() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Client | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const showErrors = (error: unknown) => getApiErrorMessages(error).forEach((errorMessage) => message.error(errorMessage));
  const query = useQuery({ queryKey: ["clients", page], queryFn: () => clientsApi.list({ page, page_size: 10 }) });

  const saveMutation = useMutation({
    mutationFn: (values: Client & { telegram?: string; vk?: string; phone?: string }) =>
      editing ? clientsApi.update(editing.id, values) : clientsApi.create(values),
    onSuccess: async () => {
      message.success("Клиент сохранен");
      setCreateOpen(false);
      setEditing(null);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: showErrors,
  });

  const deleteMutation = useMutation({
    mutationFn: clientsApi.remove,
    onSuccess: async () => {
      message.success("Клиент удален");
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: showErrors,
  });

  function openEditor(client?: Client) {
    setEditing(client ?? null);
    setCreateOpen(true);
    form.setFieldsValue(client ? { ...client, ...client.contacts } : {});
  }

  return (
    <>
      <PageHeader title="Клиенты" actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>Добавить</Button>} />
      <Table
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data?.data}
        pagination={{
          current: query.data?.info.page ?? page,
          pageSize: query.data?.info.pageSize ?? 10,
          total: query.data?.info.total,
          onChange: setPage,
        }}
        columns={[
          { title: "Фамилия", dataIndex: "lastName" },
          { title: "Имя", dataIndex: "firstName" },
          { title: "Отчество", dataIndex: "patronymic" },
          { title: "Телефон", render: (_, row) => row.contacts?.phone },
          { title: "Telegram", render: (_, row) => row.contacts?.telegram },
          {
            title: "",
            width: 112,
            render: (_, row) => (
              <Space>
                <Button icon={<EditOutlined />} onClick={() => openEditor(row)} />
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => modal.confirm({ title: "Удалить клиента?", onOk: () => deleteMutation.mutate(row.id) })}
                />
              </Space>
            ),
          },
        ]}
      />
      <Modal open={isCreateOpen} title={editing ? "Редактировать клиента" : "Новый клиент"} onCancel={() => setCreateOpen(false)} onOk={() => form.submit()} confirmLoading={saveMutation.isPending}>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={(values) => saveMutation.mutate(values)}>
          <Form.Item name="lastName" label="Фамилия" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="firstName" label="Имя" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="patronymic" label="Отчество">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Телефон">
            <Input />
          </Form.Item>
          <Form.Item name="telegram" label="Telegram">
            <Input />
          </Form.Item>
          <Form.Item name="vk" label="VK">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
