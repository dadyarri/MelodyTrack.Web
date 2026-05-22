import { CopyOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { App as AntdApp, Button, Form, Input, Modal, Space } from "antd";
import { useEffect, useState } from "react";
import { authApi, type CreateInviteInput } from "@/api/auth";
import { usersApi } from "@/api/crm";
import { getApiErrorMessages } from "@/api/http";
import { RoleSelect } from "@/components/RemoteSelect";
import { useAuth } from "@/features/auth/useAuth";
import { AccessDeniedNotice, ListTable, PageLayout, ShortcutButton } from "@/shared/ui";
import { isShortcutTarget, matchesPlainKey } from "@/utils/shortcuts";

export function UsersPage() {
  const auth = useAuth();
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [form] = Form.useForm();
  const { message } = AntdApp.useApp();
  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };
  const query = useQuery({ queryKey: ["users"], queryFn: () => usersApi.list() });
  const createInviteMutation = useMutation({
    mutationFn: (input: CreateInviteInput) => authApi.createInvite(input),
    onSuccess: (data) => {
      setInviteUrl(data.url);
      message.success("Приглашение создано");
    },
    onError: showErrors,
  });

  const closeInviteModal = () => {
    setInviteOpen(false);
    setInviteUrl("");
    form.resetFields();
  };

  const copyInviteUrl = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    message.success("Ссылка скопирована");
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isShortcutTarget(event.target)) {
        return;
      }

      if (matchesPlainKey(event, "a")) {
        event.preventDefault();
        setInviteOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!auth.user?.isAdmin) {
    return <AccessDeniedNotice message="Доступ к управлению пользователями есть только у администраторов." />;
  }

  return (
    <PageLayout
      title="Пользователи"
      actions={
        <ShortcutButton
          data-onboarding-id="users-actions"
          shortcut="A"
          type="primary"
          leadingIcon={<PlusOutlined />}
          label="Создать приглашение"
          onClick={() => {
            setInviteOpen(true);
          }}
        />
      }
    >
      <div data-onboarding-id="users-page-content">
        <ListTable
          rowKey="id"
          loading={query.isLoading}
          dataSource={query.data}
          pagination={false}
          columns={[
            { title: "Фамилия", dataIndex: "lastName" },
            { title: "Имя", dataIndex: "firstName" },
            { title: "Роль", dataIndex: "roleDisplayName" },
          ]}
        />
      </div>
      <Modal
        open={isInviteOpen}
        title="Создать приглашение"
        onCancel={closeInviteModal}
        onOk={() => {
          form.submit();
        }}
        okText="Создать"
        cancelText="Закрыть"
        confirmLoading={createInviteMutation.isPending}
      >
        <Space orientation="vertical" size={16} className="wide">
          <Form<CreateInviteInput>
            form={form}
            layout="vertical"
            requiredMark={false}
            onFinish={(values) => {
              createInviteMutation.mutate(values);
            }}
          >
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
    </PageLayout>
  );
}
