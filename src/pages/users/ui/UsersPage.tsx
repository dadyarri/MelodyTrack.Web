import { CopyOutlined, EditOutlined, KeyOutlined, PlusOutlined } from "@/shared/ui/icons";
import { Button, Form, Input, Modal, Space } from "antd";
import { RoleSelect } from "@/components/RemoteSelect";
import { UserEditorModal } from "@/features/users/UserEditorModal";
import { useUsersPageController } from "@/features/users/useUsersPageController";
import { AccessDeniedNotice, ListPageScaffold, ListTable, PageLayout, ShortcutButton } from "@/shared/ui";
import { formatPhone } from "@/entities/client";

export function UsersPage() {
  const controller = useUsersPageController();

  if (!controller.canManageUsers) {
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
            controller.setInviteOpen(true);
          }}
        />
      }
    >
      <ListPageScaffold
        contentOnboardingId="users-page-content"
        table={
          <ListTable
            rowKey="id"
            loading={controller.query.isLoading}
            dataSource={controller.query.data}
            pagination={false}
            columns={[
              { title: "Фамилия", dataIndex: "lastName" },
              { title: "Имя", dataIndex: "firstName" },
              { title: "Роль", dataIndex: "roleDisplayName" },
              {
                title: "Телефон",
                dataIndex: "phone",
                render: (value?: string | null) => (value ? formatPhone(value) : "—"),
              },
              {
                title: "Telegram",
                dataIndex: "telegram",
                render: (value?: string | null) => value || "—",
              },
              {
                title: "VK",
                dataIndex: "vk",
                render: (value?: string | null) => value || "—",
              },
              {
                title: "",
                width: 112,
                render: (_, row) => (
                  <Space>
                    <Button
                      icon={<KeyOutlined />}
                      onClick={() => {
                        controller.createPasswordResetLink(row);
                      }}
                    />
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => {
                        controller.openEditor(row);
                      }}
                    />
                  </Space>
                ),
              },
            ]}
          />
        }
      />
      <UserEditorModal
        open={Boolean(controller.editing)}
        form={controller.editForm}
        savePending={controller.updateUserMutation.isPending}
        isStale={controller.isEditingUserStale}
        staleActivity={controller.currentEditingUser?.lastActivity}
        onCancel={controller.closeEditor}
        onSubmit={controller.onEditSubmit}
      />
      <Modal
        open={controller.isInviteOpen}
        title="Создать приглашение"
        onCancel={controller.closeInviteModal}
        onOk={() => {
          controller.form.submit();
        }}
        okText="Создать"
        cancelText="Закрыть"
        confirmLoading={controller.createInviteMutation.isPending}
      >
        <Space orientation="vertical" size={16} className="wide">
          <Form form={controller.form} layout="vertical" requiredMark={false} onFinish={controller.onInviteSubmit}>
            <Form.Item name="email" label="Email" rules={[{ type: "email" }]}>
              <Input placeholder="Необязательно" />
            </Form.Item>
            <Form.Item name="role" label="Роль" rules={[{ required: true }]}>
              <RoleSelect />
            </Form.Item>
          </Form>
          <Form.Item label="Ссылка приглашения">
            <Space.Compact className="wide">
              <Input readOnly value={controller.inviteUrl} />
              <Button icon={<CopyOutlined />} disabled={!controller.inviteUrl} onClick={controller.copyInviteUrl} />
            </Space.Compact>
          </Form.Item>
        </Space>
      </Modal>
      <Modal
        open={Boolean(controller.passwordResetUser)}
        title="Ссылка на восстановление пароля"
        onCancel={controller.closePasswordResetModal}
        footer={null}
      >
        <Space orientation="vertical" size={16} className="wide">
          <div>
            Ссылка создана для пользователя{" "}
            <strong>
              {controller.passwordResetUser?.lastName} {controller.passwordResetUser?.firstName}
            </strong>
            . Предыдущие неиспользованные ссылки больше не действуют.
          </div>
          <Form.Item label="Ссылка восстановления">
            <Space.Compact className="wide">
              <Input readOnly value={controller.passwordResetUrl} />
              <Button
                icon={<CopyOutlined />}
                disabled={!controller.passwordResetUrl}
                loading={controller.createPasswordResetLinkMutation.isPending}
                onClick={controller.copyPasswordResetUrl}
              />
            </Space.Compact>
          </Form.Item>
        </Space>
      </Modal>
    </PageLayout>
  );
}
