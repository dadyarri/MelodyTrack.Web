import { CloseOutlined, DeleteOutlined, EditOutlined, PlusOutlined, ProfileOutlined, ReloadOutlined } from "@/components/icons";
import { Button, Input, Popconfirm, Space, Tag } from "antd";
import type { Client, ClientLifecycleStatus } from "@/api/types";
import { ReferenceBookCreateModal } from "@/components/ReferenceBookCreateModal";
import { ClientHistoryDrawer, formatClientName } from "@/entities/client";
import { ClientEditorModal } from "@/features/clients/ClientEditorModal";
import { CourseEnrollmentCreateModal } from "@/features/clients/CourseEnrollmentCreateModal";
import { ClientVacationsModal } from "@/features/clients/ClientVacationsModal";
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
                title: "Статус",
                width: 118,
                render: (_, row) => <ClientLifecycleTag client={row} />,
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
                width: 154,
                render: (_, row) => (
                  <Space>
                    <Button
                      icon={<ProfileOutlined />}
                      onClick={() => {
                        controller.setHistoryClient(row);
                      }}
                    />
                    {controller.canCreateClients && (row.lifecycleStatus === 1 || row.lifecycleStatus === 2) ? (
                      <Popconfirm
                        title="Закрыть лид?"
                        description="Лид останется в базе, но будет исключен из активной воронки."
                        okText="Закрыть"
                        cancelText="Отмена"
                        okButtonProps={{ danger: true, loading: controller.leadStatusMutation.isPending }}
                        onConfirm={() => {
                          controller.setLeadClosed(row, true);
                        }}
                      >
                        <Button danger icon={<CloseOutlined />} loading={controller.leadStatusMutation.isPending} />
                      </Popconfirm>
                    ) : null}
                    {controller.canCreateClients && row.lifecycleStatus === 3 ? (
                      <Popconfirm
                        title="Вернуть лид в работу?"
                        description="Статус будет пересчитан по записям клиента."
                        okText="Вернуть"
                        cancelText="Отмена"
                        okButtonProps={{ loading: controller.leadStatusMutation.isPending }}
                        onConfirm={() => {
                          controller.setLeadClosed(row, false);
                        }}
                      >
                        <Button icon={<ReloadOutlined />} loading={controller.leadStatusMutation.isPending} />
                      </Popconfirm>
                    ) : null}
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
        onCreatePortalLink={controller.canCreateClients ? controller.onCreatePortalLink : undefined}
        isCreatingPortalLink={controller.createPortalLinkMutation.isPending}
        onResetPortalPin={controller.canCreateClients ? controller.onResetPortalPin : undefined}
        isResettingPortalPin={controller.resetPortalPinMutation.isPending}
        onDeleteCourseEnrollment={controller.canCreateClients ? controller.onDeleteEnrollment : undefined}
        onOpenCourseProgress={controller.openCourseProgress}
        onUpdateThemeProgress={controller.canCreateClients ? controller.onUpdateThemeProgress : undefined}
        onEventsPageChange={controller.setHistoryEventsPage}
        onEditVacations={controller.canCreateClients ? controller.openVacationsEditor : undefined}
      />
      <CourseEnrollmentCreateModal
        open={controller.isEnrollmentCreateOpen}
        clientName={controller.historyClient ? formatClientName(controller.historyClient) : undefined}
        options={controller.availableEnrollmentCourses}
        confirmLoading={controller.createEnrollmentMutation.isPending}
        onCancel={controller.closeEnrollmentCreate}
        onSubmit={controller.onCreateEnrollment}
      />
      <ClientVacationsModal
        client={controller.vacationsClient}
        form={controller.vacationsForm}
        saving={controller.vacationsMutation.isPending}
        onCancel={controller.closeVacationsEditor}
        onSubmit={controller.saveVacations}
      />
    </PageLayout>
  );
}

function ClientLifecycleTag({ client }: { client: Client }) {
  const lifecycleStatus = client.lifecycleStatus;
  if (lifecycleStatus === 0) {
    return null;
  }

  const labels: Record<Exclude<ClientLifecycleStatus, 0>, { label: string; color: string }> = {
    1: { label: "Лид", color: "blue" },
    2: { label: "Думает", color: "gold" },
    3: { label: "Закрыт", color: "default" },
  };
  const status = labels[lifecycleStatus];

  return <Tag color={status.color}>{status.label}</Tag>;
}
