import { DeleteOutlined, EditOutlined, PlusOutlined, ProfileOutlined } from "@/components/icons";
import { Button, Input, Space, Tag } from "antd";
import { ReferenceBookCreateModal } from "@/components/ReferenceBookCreateModal";
import { ClientHistoryDrawer, formatClientName } from "@/entities/client";
import { CourseEnrollmentCreateModal } from "@/features/clients/CourseEnrollmentCreateModal";
import { ClientEditorModal } from "@/features/clients/ClientEditorModal";
import { useClientsPageController } from "@/features/clients/useClientsPageController";
import { ListFilters, ListPageScaffold, ListTable, PageLayout, ShortcutButton } from "@/shared/ui";
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
        controller.canCreateClients ? (
          <ShortcutButton
            data-onboarding-id="clients-actions"
            shortcut="A"
            type="primary"
            leadingIcon={<PlusOutlined />}
            label="Добавить"
            onClick={() => {
              controller.openEditor();
            }}
          />
        ) : undefined
      }
    >
      <ListPageScaffold
        contentOnboardingId="clients-page-content"
        filters={
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
        }
        table={
          <ListTable
            rowKey="id"
            loading={controller.query.isLoading}
            dataSource={controller.clients}
            pagination={{
              current: controller.pagination.current,
              pageSize: controller.pagination.pageSize,
              total: controller.pagination.total,
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
              {
                title: "Последняя запись",
                render: (_, row) => (row.lastAppointmentAtUtc ? formatDateTime(row.lastAppointmentAtUtc) : "Нет"),
              },
              {
                title: "Следующая запись",
                render: (_, row) => (row.nextAppointmentAtUtc ? formatDateTime(row.nextAppointmentAtUtc) : "Нет"),
              },
              {
                title: "Баланс",
                dataIndex: "balance",
                render: (_, row) => <Tag color={row.balance < 0 ? "red" : "green"}>{formatMoney(row.balance)}</Tag>,
              },
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
        }
      />
      <ClientEditorModal
        open={controller.isCreateOpen}
        editing={Boolean(controller.editing)}
        draftRestored={controller.hasCreateDraft && controller.isCreateOpen}
        form={controller.form}
        savePending={controller.saveMutation.isPending}
        isStale={controller.isEditingClientStale}
        staleActivity={controller.currentEditingClient?.lastActivity}
        sourceOptions={controller.createdSourceOptions}
        onCancel={controller.closeEditor}
        onClearDraft={controller.handleClearCreateDraft}
        onSubmit={controller.onSubmit}
        onValuesChange={controller.onValuesChange}
        onCreateSource={controller.canCreateClients ? controller.openSourceCreate : undefined}
        onSourceLabelChange={controller.onSourceLabelChange}
      />
      <ReferenceBookCreateModal
        open={controller.isSourceCreateOpen}
        title="Новый источник клиента"
        confirmLoading={controller.createSourceMutation.isPending}
        onCancel={controller.closeSourceCreate}
        onSubmit={controller.onCreateSource}
      />
      <ClientHistoryDrawer
        client={controller.historyClient}
        data={controller.historyQuery.data}
        isLoading={controller.historyQuery.isLoading}
        isError={controller.historyQuery.isError}
        courseEnrollments={controller.courseEnrollmentsQuery.data}
        isCourseEnrollmentsLoading={controller.courseEnrollmentsQuery.isLoading}
        isCourseEnrollmentsError={controller.courseEnrollmentsQuery.isError}
        onClose={controller.closeHistoryClient}
        onCreateAppointment={controller.clientHistoryActions.onCreateAppointment}
        onCreatePayment={controller.clientHistoryActions.onCreatePayment}
        onCreateCourseEnrollment={controller.canCreateClients ? controller.openEnrollmentCreate : undefined}
        onAppointmentsPageChange={controller.setHistoryAppointmentsPage}
      />
      <CourseEnrollmentCreateModal
        open={controller.isEnrollmentCreateOpen}
        clientName={controller.historyClient ? formatClientName(controller.historyClient) : undefined}
        options={controller.availableEnrollmentCourses}
        confirmLoading={controller.createEnrollmentMutation.isPending}
        onCancel={controller.closeEnrollmentCreate}
        onSubmit={controller.onCreateEnrollment}
      />
    </PageLayout>
  );
}
