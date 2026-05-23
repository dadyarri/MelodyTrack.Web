import { LeftOutlined, PlusOutlined, RightOutlined } from "@ant-design/icons";
import { Button, Space, Typography } from "antd";
import dayjs from "dayjs";
import { ClientQuickCreateModal } from "@/components/ClientQuickCreateModal";
import { UserSelect } from "@/components/RemoteSelect";
import {
  AppointmentCreateModal,
  AppointmentDetailsModal,
  AppointmentEditModal,
  RecurringDeleteModal,
} from "@/features/schedule/ScheduleModals";
import { AppointmentsCalendar } from "@/features/schedule/ScheduleCalendar";
import { useSchedulePageController } from "@/features/schedule/useSchedulePageController";
import { PageLayout, ShortcutButton } from "@/shared/ui";
import styles from "./SchedulePage.module.css";

export function SchedulePage() {
  const controller = useSchedulePageController();

  return (
    <>
      <PageLayout
        title="Расписание"
        customClass={styles.pageShell}
        actions={
          <Space wrap className={styles.headerActions} data-onboarding-id="schedule-header-actions">
            <ShortcutButton
              shortcut="←"
              leadingIcon={<LeftOutlined />}
              label="Пред."
              onClick={() => {
                controller.setWeekStart((value) => value.subtract(1, "week"));
              }}
            />
            <ShortcutButton
              shortcut="Home"
              label="Сегодня"
              onClick={() => {
                controller.setWeekStart(dayjs().startOf("week"));
              }}
            />
            <ShortcutButton
              shortcut="→"
              leadingIcon={<RightOutlined />}
              label="След."
              onClick={() => {
                controller.setWeekStart((value) => value.add(1, "week"));
              }}
            />
            {controller.canCreateAppointments ? (
              <ShortcutButton
                shortcut="A"
                type="primary"
                leadingIcon={<PlusOutlined />}
                label="Добавить"
                onClick={controller.openCreateModal}
              />
            ) : null}
          </Space>
        }
      >
        <section className={styles.pageShell}>
          {!controller.isSpecialistFilterLocked ? (
            <div className={styles.toolbar} data-onboarding-id="schedule-toolbar">
              <div className={styles.quickFilters}>
                <Typography.Text type="secondary">Преподаватель</Typography.Text>
                <Space.Compact className={styles.quickFiltersControls}>
                  <UserSelect value={controller.effectiveProviderFilterId} onChange={controller.setProviderFilterId} />
                  {controller.auth.user?.id
                    ? (() => {
                        const currentUserId = controller.auth.user.id;
                        return (
                          <ShortcutButton
                            shortcut="M"
                            type={controller.effectiveProviderFilterId === currentUserId ? "primary" : "default"}
                            disabled={false}
                            label="Моё"
                            onClick={() => {
                              controller.setProviderFilterId((current) => (current === currentUserId ? undefined : currentUserId));
                            }}
                          />
                        );
                      })()
                    : null}
                  <Button
                    disabled={!controller.effectiveProviderFilterId}
                    onClick={() => {
                      controller.setProviderFilterId(undefined);
                    }}
                  >
                    Сбросить
                  </Button>
                </Space.Compact>
              </div>
            </div>
          ) : null}
          <div className={styles.calendar} data-onboarding-id="schedule-calendar">
            <AppointmentsCalendar
              appointments={controller.filteredAppointments}
              availability={controller.providerAvailabilityQuery.data}
              canCreateAppointments={controller.canCreateAppointments}
              loading={controller.query.isLoading}
              onReschedule={(appointment, startDate) => {
                controller.rescheduleMutation.mutate({
                  appointment,
                  startDate,
                  expectedActivityId: appointment.lastActivity?.id,
                });
              }}
              range={[controller.weekStart, controller.weekStart.endOf("week")]}
              reschedulePendingAppointmentId={
                controller.rescheduleMutation.isPending ? controller.rescheduleMutation.variables.appointment.id : null
              }
              onCreateAt={controller.openCreateModalAt}
              onSelect={(appointment) => {
                controller.setSelectedAppointment(appointment);
                controller.setSelectedAppointmentBaselineActivityId(appointment.lastActivity?.id ?? null);
              }}
              selectedAppointmentId={controller.selectedAppointment?.id ?? null}
            />
          </div>
        </section>
      </PageLayout>
      <AppointmentDetailsModal
        appointment={controller.currentSelectedAppointment}
        isStale={controller.isSelectedAppointmentStale}
        onClose={() => {
          controller.setSelectedAppointment(null);
          controller.setSelectedAppointmentBaselineActivityId(undefined);
        }}
        onEdit={(appointment) => {
          controller.setSelectedAppointment(null);
          controller.setSelectedAppointmentBaselineActivityId(undefined);
          controller.setAppointmentToEdit(appointment);
          controller.setAppointmentToEditBaselineActivityId(appointment.lastActivity?.id ?? null);
        }}
        onStatusChange={(appointment, status) => {
          controller.updateMutation.mutate({
            id: appointment.id,
            input: { status },
            expectedActivityId: controller.selectedAppointmentBaselineActivityId ?? undefined,
          });
        }}
        onDelete={(appointment) => {
          if (appointment.recurringRule) {
            controller.setAppointmentToDelete(appointment);
            controller.setAppointmentToDeleteBaselineActivityId(
              controller.selectedAppointmentBaselineActivityId ?? appointment.lastActivity?.id ?? null,
            );
            return;
          }

          controller.modal.confirm({
            title: "Удалить запись?",
            onOk: () => {
              controller.deleteMutation.mutate({
                id: appointment.id,
                expectedActivityId: controller.selectedAppointmentBaselineActivityId ?? undefined,
              });
            },
          });
        }}
      />
      <RecurringDeleteModal
        appointment={controller.currentDeletingAppointment}
        deletePending={controller.deleteMutation.isPending}
        isStale={controller.isDeletingAppointmentStale}
        onCancel={() => {
          controller.setAppointmentToDelete(null);
          controller.setAppointmentToDeleteBaselineActivityId(undefined);
        }}
        onDelete={(appointment, scope) => {
          controller.deleteMutation.mutate({
            id: appointment.id,
            scope,
            expectedActivityId: controller.appointmentToDeleteBaselineActivityId ?? undefined,
          });
        }}
      />
      <AppointmentCreateModal
        canCreateClient={controller.canCreateAppointments}
        createPending={controller.createMutation.isPending}
        createdClientOptions={controller.createdClientOptions}
        draftRestored={controller.hasCreateDraft && controller.isCreateModalOpen}
        form={controller.form}
        lockedProviderId={controller.lockedProviderId}
        onCreateClient={() => {
          controller.setQuickClientCreateOpen(true);
        }}
        onCancel={controller.closeCreateModal}
        onDraftChange={controller.handleCreateDraftChange}
        onSubmit={(values) => {
          controller.createMutation.mutate(values);
        }}
        onClientLabelChange={controller.setCreateClientLabel}
        onServiceLabelChange={controller.setCreateServiceLabel}
        onProviderLabelChange={controller.setCreateProviderLabel}
        open={controller.isCreateModalOpen}
        onClearDraft={controller.handleClearCreateDraft}
        recurrenceTypes={controller.recurrenceTypesQuery.data ?? []}
        recurrenceTypesLoading={controller.recurrenceTypesQuery.isLoading}
      />
      <AppointmentEditModal
        appointment={controller.currentEditingAppointment}
        canCreateClient={controller.canCreateAppointments}
        createdClientOptions={controller.createdClientOptions}
        editPending={controller.editMutation.isPending}
        form={controller.editForm}
        isStale={controller.isEditingAppointmentStale}
        lockedProviderId={controller.lockedProviderId}
        onCreateClient={() => {
          controller.setQuickClientCreateOpen(true);
        }}
        onCancel={() => {
          controller.setAppointmentToEdit(null);
          controller.setAppointmentToEditBaselineActivityId(undefined);
        }}
        onSubmit={(values) => {
          if (!controller.appointmentToEdit) {
            return;
          }

          controller.editMutation.mutate({
            id: controller.appointmentToEdit.id,
            input: values,
            expectedActivityId: controller.appointmentToEditBaselineActivityId ?? undefined,
          });
        }}
      />
      <ClientQuickCreateModal
        open={controller.isQuickClientCreateOpen}
        onCancel={() => {
          controller.setQuickClientCreateOpen(false);
        }}
        onCreated={controller.onQuickClientCreated}
      />
    </>
  );
}
