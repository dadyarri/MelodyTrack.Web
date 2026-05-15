import { DeleteOutlined, EditOutlined, PlusOutlined, ProfileOutlined } from "@ant-design/icons";
import { Button, Input, Space, Tag } from "antd";
import {
  ClientHistoryDrawer,
  formatClientName,
  getClientContactValue,
  renderClientPhoneLink,
  renderClientSocialLink,
} from "@/entities/client";
import { ClientEditorModal } from "@/features/clients/ClientEditorModal";
import { useClientsPageController } from "@/features/clients/useClientsPageController";
import { ListFilters, ListTable, PageLayout, ShortcutButton } from "@/shared/ui";
import { filterFieldWideClassName } from "@/shared/ui/filterFieldStyles";
import { formatDateTime } from "@/utils/date";
import { formatMoney } from "@/utils/money";
import tableLinkButtonStyles from "@/shared/ui/TableLinkButton.module.css";

export function ClientsPage() {
  const controller = useClientsPageController();

  return (
    <PageLayout
      title="Клиенты"
      actions={
        <ShortcutButton
          shortcut="A"
          type="primary"
          leadingIcon={<PlusOutlined />}
          label="Добавить"
          onClick={() => {
            controller.openEditor();
          }}
        />
      }
    >
      <ListFilters>
        <div className={filterFieldWideClassName}>
          <Input.Search
            allowClear
            placeholder="Поиск по ФИО"
            onSearch={controller.handleSearch}
            onChange={(event) => {
              if (!event.target.value) {
                controller.handleSearch("");
              }
            }}
          />
        </div>
      </ListFilters>
      <ListTable
        rowKey="id"
        loading={controller.query.isLoading}
        dataSource={controller.query.data?.data}
        pagination={{
          current: controller.query.data?.info.page ?? controller.page,
          pageSize: controller.query.data?.info.pageSize ?? 10,
          total: controller.query.data?.info.total,
          onChange: controller.setPage,
        }}
        columns={[
          {
            title: "ФИО",
            render: (_, row) => (
              <Button
                type="link"
                className={tableLinkButtonStyles.button}
                onClick={() => {
                  controller.setHistoryClient(row);
                }}
              >
                {formatClientName(row)}
              </Button>
            ),
          },
          { title: "Последняя запись", render: (_, row) => (row.lastAppointmentAtUtc ? formatDateTime(row.lastAppointmentAtUtc) : "Нет") },
          { title: "Следующая запись", render: (_, row) => (row.nextAppointmentAtUtc ? formatDateTime(row.nextAppointmentAtUtc) : "Нет") },
          {
            title: "Баланс",
            dataIndex: "balance",
            render: (_, row) => <Tag color={row.balance < 0 ? "red" : "green"}>{formatMoney(row.balance)}</Tag>,
          },
          { title: "Телефон", render: (_, row) => renderClientPhoneLink(getClientContactValue(row, "phone")) },
          { title: "Telegram", render: (_, row) => renderClientSocialLink(getClientContactValue(row, "telegram"), "telegram") },
          { title: "VK", render: (_, row) => renderClientSocialLink(getClientContactValue(row, "vk"), "vk") },
          {
            title: "",
            width: 112,
            render: (_, row) => (
              <Space>
                <Button
                  icon={<ProfileOutlined />}
                  onClick={() => {
                    controller.setHistoryClient(row);
                  }}
                />
                <Button
                  icon={<EditOutlined />}
                  onClick={() => {
                    controller.openEditor(row);
                  }}
                />
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    controller.confirmDelete(row);
                  }}
                />
              </Space>
            ),
          },
        ]}
      />
      <ClientEditorModal
        open={controller.isCreateOpen}
        editing={Boolean(controller.editing)}
        draftRestored={controller.hasCreateDraft && controller.isCreateOpen}
        form={controller.form}
        savePending={controller.saveMutation.isPending}
        isStale={controller.isEditingClientStale}
        staleActivity={controller.currentEditingClient?.lastActivity}
        phoneInputKey={controller.createPhoneInputKey}
        onCancel={controller.closeEditor}
        onClearDraft={controller.handleClearCreateDraft}
        onSubmit={controller.onSubmit}
        onValuesChange={controller.onValuesChange}
      />
      <ClientHistoryDrawer
        client={controller.historyClient}
        data={controller.historyQuery.data}
        isLoading={controller.historyQuery.isLoading}
        isError={controller.historyQuery.isError}
        onClose={() => {
          controller.setHistoryClient(null);
        }}
        onCreateAppointment={controller.openClientHistoryFromDashboard.onCreateAppointment}
        onCreatePayment={controller.openClientHistoryFromDashboard.onCreatePayment}
      />
    </PageLayout>
  );
}
