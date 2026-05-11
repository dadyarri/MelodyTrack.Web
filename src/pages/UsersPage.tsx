import { CopyOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, App as AntdApp, Button, Form, Input, Modal, Space, Table } from "antd";
import { useState } from "react";
import { authApi } from "../api/auth";
import { usersApi } from "../api/crm";
import { getApiErrorMessages } from "../api/http";
import { RoleSelect } from "../components/RemoteSelect";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../features/auth/useAuth";

export function UsersPage() {
  const auth = useAuth();
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [form] = Form.useForm();
  const { message } = AntdApp.useApp();
  const showErrors = (error: unknown) => getApiErrorMessages(error).forEach((errorMessage) => message.error(errorMessage));
  const query = useQuery({ queryKey: ["users"], queryFn: usersApi.list });
  const createInviteMutation = useMutation({
    mutationFn: authApi.createInvite,
    onSuccess: (data) => {
      setInviteUrl(data.url);
      message.success("Приглашение создано");
    },
    onError: showErrors,
  });

  if (!auth.user?.isAdmin) {
    return <Alert type="error" showIcon message="Доступ к управлению пользователями есть только у администраторов." />;
  }

  const closeInviteModal = () => {
    setInviteOpen(false);
    setInviteUrl("");
    form.resetFields();
  };

  const copyInviteUrl = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    message.success("Ссылка скопирована");
  };

  return (
    <>
      <PageHeader
        title="Пользователи"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setInviteOpen(true)}>
            Создать приглашение
          </Button>
        }
      />
      <Table
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data}
        pagination={false}
        scroll={{ x: "max-content" }}
        columns={[
          { title: "Фамилия", dataIndex: "lastName" },
          { title: "Имя", dataIndex: "firstName" },
          { title: "Роль", dataIndex: "roleDisplayName" },
        ]}
      />
      <Modal
        open={isInviteOpen}
        title="Создать приглашение"
        onCancel={closeInviteModal}
        onOk={() => form.submit()}
        okText="Создать"
        cancelText="Закрыть"
        confirmLoading={createInviteMutation.isPending}
      >
        <Space direction="vertical" size={16} className="wide">
          <Form form={form} layout="vertical" requiredMark={false} onFinish={(values) => createInviteMutation.mutate(values)}>
            <Form.Item name="email" label="Email" rules={[{ required: true }, { type: "email" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="role" label="Роль" rules={[{ required: true }]}>
              <RoleSelect />
            </Form.Item>
          </Form>
          <Form.Item label="Ссылка приглашения">
            <Space.Compact className="wide">
              <Input readOnly value={inviteUrl} />
              <Button icon={<CopyOutlined />} disabled={!inviteUrl} onClick={copyInviteUrl} />
            </Space.Compact>
          </Form.Item>
        </Space>
      </Modal>
    </>
  );
}
