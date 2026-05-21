import { CheckOutlined, ClockCircleOutlined, CloseOutlined, FireOutlined } from "@ant-design/icons";
import { Tag } from "antd";
import type { AppointmentStatus } from "@/api/types";

export function getAppointmentStatusLabel(status: AppointmentStatus) {
  switch (status) {
    case "completed":
      return "Завершена";
    case "cancelled":
      return "Отменена";
    case "burned":
      return "Сгорела";
    default:
      return "Запланирована";
  }
}

export function renderAppointmentStatusIcon(status: AppointmentStatus) {
  switch (status) {
    case "completed":
      return <CheckOutlined />;
    case "cancelled":
      return <CloseOutlined />;
    case "burned":
      return <FireOutlined />;
    default:
      return <ClockCircleOutlined />;
  }
}

export function getAppointmentStatusTagColor(status: AppointmentStatus) {
  switch (status) {
    case "completed":
      return "green";
    case "cancelled":
      return "default";
    case "burned":
      return "orange";
    default:
      return "blue";
  }
}

export function renderAppointmentStatusTag(status: AppointmentStatus) {
  return <Tag color={getAppointmentStatusTagColor(status)}>{getAppointmentStatusLabel(status)}</Tag>;
}

export function isPlannedAppointment(status: AppointmentStatus) {
  return status === "planned";
}
