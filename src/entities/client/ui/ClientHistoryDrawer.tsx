import { Drawer } from "antd";
import type { Client, ClientHistory, CourseEnrollment } from "@/api/types";
import { QueryStateBlock } from "@/shared/ui";
import { formatClientName } from "../lib/client";
import { ClientHistoryPanel } from "./ClientHistoryPanel";

type ClientHistoryDrawerProps = {
  client: Client | null;
  data?: ClientHistory;
  isLoading: boolean;
  isError: boolean;
  courseEnrollments?: CourseEnrollment[];
  isCourseEnrollmentsLoading?: boolean;
  isCourseEnrollmentsError?: boolean;
  onClose: () => void;
  onCreateAppointment?: (client: ClientHistory["client"]) => void;
  onCreatePayment?: (client: ClientHistory["client"]) => void;
  onCreateCourseEnrollment?: () => void;
  onDeleteCourseEnrollment?: (enrollmentId: string) => void;
  onAppointmentsPageChange?: (page: number) => void;
};

export function ClientHistoryDrawer({
  client,
  data,
  isLoading,
  isError,
  courseEnrollments,
  isCourseEnrollmentsLoading = false,
  isCourseEnrollmentsError = false,
  onClose,
  onCreateAppointment,
  onCreatePayment,
  onCreateCourseEnrollment,
  onDeleteCourseEnrollment,
  onAppointmentsPageChange,
}: ClientHistoryDrawerProps) {
  return (
    <Drawer
      title={client ? `История клиента: ${formatClientName(client)}` : "История клиента"}
      size="large"
      open={Boolean(client)}
      onClose={onClose}
      destroyOnHidden
    >
      {data ? (
        <ClientHistoryPanel
          data={data}
          courseEnrollments={courseEnrollments}
          isCourseEnrollmentsLoading={isCourseEnrollmentsLoading}
          isCourseEnrollmentsError={isCourseEnrollmentsError}
          onCreateAppointment={onCreateAppointment}
          onCreatePayment={onCreatePayment}
          onCreateCourseEnrollment={onCreateCourseEnrollment}
          onDeleteCourseEnrollment={onDeleteCourseEnrollment}
          onAppointmentsPageChange={onAppointmentsPageChange}
        />
      ) : null}
      <QueryStateBlock
        isLoading={isLoading}
        isError={isError}
        isEmpty={!isLoading && !isError && !data}
        loadingText="Загрузка истории..."
        emptyText="История клиента пока недоступна"
        errorMessage="Не удалось загрузить историю клиента."
      />
    </Drawer>
  );
}
