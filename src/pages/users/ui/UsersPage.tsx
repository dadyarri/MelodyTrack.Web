import { Button, Form, Input, Modal, Space } from "antd";

import { formatPhone } from "@/entities/client";
import { RoleSelect } from "@/entities/user";
import { UserEditorModal } from "@/features/edit-user";
import {
  AccessDeniedNotice,
  ActionableEmptyState,
  DraftFormModal,
  ListPageScaffold,
  ListTable,
  PageLayout,
  ShortcutButton,
} from "@/shared/ui";
import { CopyOutlined, EditOutlined, KeyOutlined, PlusOutlined } from "@/shared/ui/icons";

import { useUsersPageController } from "../model/useUsersPageController";

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
            emptyText={
              <ActionableEmptyState
                description="Пользователей пока нет"
                actionLabel="Создать приглашение"
                onAction={() => {
                  controller.setInviteOpen(true);
                }}
              />
            }
            loading={controller.query.isLoading}
            queryStatus={{
              isError: controller.query.isError,
              isFetching: controller.query.isFetching,
              onRetry: () => {
                void controller.query.refetch();
              },
            }}
            dataSource={controller.query.data}
            pagination={false}
            columns={[
              { title: "Фамилия", dataIndex: "lastName" },
              { title: "Имя", dataIndex: "firstName" },
              { title: "Роль", dataIndex: "roleDisplayName", responsive: ["sm"] },
              {
                title: "Телефон",
                dataIndex: "phone",
                responsive: ["md"],
                render: (value?: string | null) => (value ? formatPhone(value) : "—"),
              },
              {
                title: "Telegram",
                dataIndex: "telegram",
                responsive: ["lg"],
                render: (value?: string | null) => value || "—",
              },
              {
                title: "VK",
                dataIndex: "vk",
                responsive: ["lg"],
                render: (value?: string | null) => value || "—",
              },
              {
                title: "",
                width: 112,
                render: (_, row) => (
                  <Space>
                    <Button
                      icon={<KeyOutlined />}
                      aria-label="Создать ссылку восстановления пароля"
                      title="Восстановление пароля"
                      loading={
                        controller.createPasswordResetLinkMutation.isPending &&
                        controller.createPasswordResetLinkMutation.variables.id === row.id
                      }
                      onClick={() => {
                        controller.createPasswordResetLink(row);
                      }}
                    />
                    <Button
                      icon={<EditOutlined />}
                      aria-label="Редактировать пользователя"
                      title="Редактировать"
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
        draftStatus={controller.editDraft.status}
        draftRestored={controller.editDraft.restored}
        hasDraft={controller.editDraft.hasDraft}
        onDiscardDraft={() => {
          void controller.editDraft.discard().then(() => {
            if (controller.editing) {
              controller.openEditor(controller.editing);
            }
          });
        }}
        onValuesChange={controller.onEditValuesChange}
        draftStale={controller.editDraft.isStale}
        onReapplyDraft={controller.editDraft.reapply}
        onRetryDraft={controller.editDraft.retry}
        onCancel={controller.closeEditor}
        onSubmit={controller.onEditSubmit}
      />
      <DraftFormModal
        open={controller.isInviteOpen}
        title="Создать приглашение"
        restored={controller.inviteDraft.restored}
        saveStatus={controller.inviteDraft.status}
        showClearDraft={controller.inviteDraft.hasDraft && !controller.inviteUrl}
        onClearDraft={() => {
          void controller.inviteDraft.discard().then(() => {
            controller.form.resetFields();
          });
        }}
        onRetryDraft={controller.inviteDraft.retry}
        onCancel={controller.closeInviteModal}
        onOk={() => {
          controller.form.submit();
        }}
        okText="Создать"
        cancelText="Закрыть"
        confirmLoading={controller.createInviteMutation.isPending}
      >
        <Space orientation="vertical" size={16} className="wide">
          <Form
            form={controller.form}
            layout="vertical"
            requiredMark={false}
            onFinish={controller.onInviteSubmit}
            onValuesChange={controller.onInviteValuesChange}
          >
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
              <Button
                icon={<CopyOutlined />}
                aria-label="Копировать ссылку приглашения"
                title="Копировать"
                disabled={!controller.inviteUrl}
                onClick={controller.copyInviteUrl}
              />
            </Space.Compact>
          </Form.Item>
        </Space>
      </DraftFormModal>
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
                aria-label="Копировать ссылку восстановления"
                title="Копировать"
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
