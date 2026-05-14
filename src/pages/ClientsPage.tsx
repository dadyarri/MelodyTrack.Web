import { DeleteOutlined, EditOutlined, PlusOutlined, ProfileOutlined } from "@ant-design/icons";
import { Button, Drawer, Input, Space, Tag } from "antd";
import { ClientHistoryPanel } from "../components/ClientHistoryPanel";
import { ListFilters } from "../components/ListFilters";
import { ListTable } from "../components/ListTable";
import { PageHeader } from "../components/PageHeader";
import { QueryStateBlock } from "../components/QueryStateBlock";
import { ShortcutButton } from "../components/ShortcutButton";
import { ClientEditorModal } from "../features/clients/ClientEditorModal";
import { formatClientName, getContactValue, renderPhoneLink, renderSocialLink, useClientsPageController } from "../features/clients/useClientsPageController";
import { formatDateTime } from "../utils/date";
import { formatMoney } from "../utils/money";

export function ClientsPage() {
  const controller = useClientsPageController();

  return (
    <>
      <PageHeader
        title="Клиенты"
        actions={<ShortcutButton shortcut="A" type="primary" leadingIcon={<PlusOutlined />} label="Добавить" onClick={() => controller.openEditor()} />}
      />
      <ListFilters>
        <div className="filter-field filter-field-wide">
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
              <Button type="link" className="table-link-button" onClick={() => controller.setHistoryClient(row)}>
                {formatClientName(row)}
              </Button>
            ),
          },
          { title: "Последняя запись", render: (_, row) => row.lastAppointmentAtUtc ? formatDateTime(row.lastAppointmentAtUtc) : "Нет" },
          { title: "Следующая запись", render: (_, row) => row.nextAppointmentAtUtc ? formatDateTime(row.nextAppointmentAtUtc) : "Нет" },
          { title: "Баланс", dataIndex: "balance", render: (_, row) => <Tag color={row.balance < 0 ? "red" : "green"}>{formatMoney(row.balance)}</Tag> },
          { title: "Телефон", render: (_, row) => renderPhoneLink(getContactValue(row, "phone")) },
          { title: "Telegram", render: (_, row) => renderSocialLink(getContactValue(row, "telegram"), "telegram") },
          { title: "VK", render: (_, row) => renderSocialLink(getContactValue(row, "vk"), "vk") },
          {
            title: "",
            width: 112,
            render: (_, row) => (
              <Space>
                <Button icon={<ProfileOutlined />} onClick={() => controller.setHistoryClient(row)} />
                <Button icon={<EditOutlined />} onClick={() => controller.openEditor(row)} />
                <Button danger icon={<DeleteOutlined />} onClick={() => controller.confirmDelete(row)} />
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
      <Drawer
        title={controller.historyClient ? `История клиента: ${formatClientName(controller.historyClient)}` : "История клиента"}
        width={720}
        open={Boolean(controller.historyClient)}
        onClose={() => controller.setHistoryClient(null)}
        destroyOnHidden
      >
        {controller.historyQuery.data ? (
          <ClientHistoryPanel
            data={controller.historyQuery.data}
            onCreateAppointment={controller.openClientHistoryFromDashboard.onCreateAppointment}
            onCreatePayment={controller.openClientHistoryFromDashboard.onCreatePayment}
          />
        ) : null}
        <QueryStateBlock
          isLoading={controller.historyQuery.isLoading}
          isError={controller.historyQuery.isError}
          isEmpty={!controller.historyQuery.isLoading && !controller.historyQuery.isError && !controller.historyQuery.data}
          loadingText="Загрузка истории..."
          emptyText="История клиента пока недоступна"
          errorMessage="Не удалось загрузить историю клиента."
        />
      </Drawer>
    </>
  );
}
