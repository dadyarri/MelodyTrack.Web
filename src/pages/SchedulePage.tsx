import { LeftOutlined, PlusOutlined, RightOutlined } from "@ant-design/icons";
import { Button, Space, Typography } from "antd";
import { ClientQuickCreateModal } from "../components/ClientQuickCreateModal";
import { PageLayout } from "../components/PageLayout";
import { UserSelect } from "../components/RemoteSelect";
import { ShortcutButton } from "../components/ShortcutButton";
import { AppointmentsCalendar } from "../features/schedule/ScheduleCalendar";
import {
  AppointmentCreateModal,
  AppointmentDetailsModal,
  AppointmentEditModal,
  RecurringDeleteModal,
} from "../features/schedule/ScheduleModals";
import { useSchedulePageController } from "../features/schedule/useSchedulePageController";

export function SchedulePage() {
  const controller = useSchedulePageController();

  return (
    <>
      <PageLayout
        title="Расписание"
        customClass="schedule-page"
        actions={
          <Space wrap className="schedule-header-actions">
            <ShortcutButton
              shortcut="←"
              leadingIcon={<LeftOutlined />}
              label="Пред."
              onClick={() => controller.setWeekStart((value) => value.subtract(1, "week"))}
            />
            <ShortcutButton shortcut="Home" label="Сегодня" onClick={() => controller.setWeekStart(controller.weekStart.startOf("week"))} />
            <ShortcutButton
              shortcut="→"
              leadingIcon={<RightOutlined />}
              label="След."
              onClick={() => controller.setWeekStart((value) => value.add(1, "week"))}
            />
            <ShortcutButton
              shortcut="A"
              type="primary"
              leadingIcon={<PlusOutlined />}
              label="Добавить"
              onClick={controller.openCreateModal}
            />
          </Space>
        }
      >
        <section className="schedule-page">
          <div className="schedule-page-toolbar">
            <div className="schedule-quick-filters">
              <Typography.Text type="secondary">Специалист</Typography.Text>
              <Space.Compact className="schedule-quick-filters-controls">
                <UserSelect
                  value={controller.effectiveProviderFilterId}
                  onChange={controller.setProviderFilterId}
                  disabled={controller.isSpecialistFilterLocked}
                />
                {!controller.isSpecialistFilterLocked && controller.auth.user?.id ? (
                  <ShortcutButton
                    shortcut="M"
                    type={controller.effectiveProviderFilterId === controller.auth.user?.id ? "primary" : "default"}
                    disabled={!controller.auth.user?.id}
                    label="Моё"
                    onClick={() =>
                      controller.setProviderFilterId((current) =>
                        current === controller.auth.user?.id ? undefined : controller.auth.user?.id,
                      )
                    }
                  />
                ) : null}
                <Button
                  disabled={controller.isSpecialistFilterLocked || !controller.effectiveProviderFilterId}
                  onClick={() => controller.setProviderFilterId(undefined)}
                >
                  Сбросить
                </Button>
              </Space.Compact>
            </div>
          </div>
          <div className="schedule-page-calendar">
            <AppointmentsCalendar
              appointments={controller.filteredAppointments}
              loading={controller.query.isLoading}
              onReschedule={(appointment, startDate) =>
                controller.rescheduleMutation.mutate({
                  appointment,
                  startDate,
                  expectedActivityId: appointment.lastActivity?.id ?? undefined,
                })
              }
              range={[controller.weekStart, controller.weekStart.endOf("week")]}
              reschedulePendingAppointmentId={
                controller.rescheduleMutation.isPending ? (controller.rescheduleMutation.variables?.appointment.id ?? null) : null
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
        onComplete={(appointment) =>
          controller.updateMutation.mutate({
            id: appointment.id,
            input: { isCompleted: true, isCanceled: false },
            expectedActivityId: controller.selectedAppointmentBaselineActivityId ?? undefined,
          })
        }
        onCancel={(appointment) =>
          controller.updateMutation.mutate({
            id: appointment.id,
            input: { isCanceled: true },
            expectedActivityId: controller.selectedAppointmentBaselineActivityId ?? undefined,
          })
        }
        onRestore={(appointment) =>
          controller.updateMutation.mutate({
            id: appointment.id,
            input: { isCompleted: false, isCanceled: false },
            expectedActivityId: controller.selectedAppointmentBaselineActivityId ?? undefined,
          })
        }
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
            onOk: () =>
              controller.deleteMutation.mutate({
                id: appointment.id,
                expectedActivityId: controller.selectedAppointmentBaselineActivityId ?? undefined,
              }),
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
        onDelete={(appointment, scope) =>
          controller.deleteMutation.mutate({
            id: appointment.id,
            scope,
            expectedActivityId: controller.appointmentToDeleteBaselineActivityId ?? undefined,
          })
        }
      />
      <AppointmentCreateModal
        createPending={controller.createMutation.isPending}
        createdClientOptions={controller.createdClientOptions}
        draftRestored={controller.hasCreateDraft && controller.isCreateModalOpen}
        form={controller.form}
        lockedProviderId={controller.lockedProviderId}
        onCreateClient={() => controller.setQuickClientCreateOpen(true)}
        onCancel={controller.closeCreateModal}
        onDraftChange={controller.handleCreateDraftChange}
        onSubmit={(values) => controller.createMutation.mutate(values)}
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
        createdClientOptions={controller.createdClientOptions}
        editPending={controller.editMutation.isPending}
        form={controller.editForm}
        isStale={controller.isEditingAppointmentStale}
        lockedProviderId={controller.lockedProviderId}
        onCreateClient={() => controller.setQuickClientCreateOpen(true)}
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
        onCancel={() => controller.setQuickClientCreateOpen(false)}
        onCreated={controller.onQuickClientCreated}
      />
    </>
  );
}
