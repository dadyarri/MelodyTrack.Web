import { CheckOutlined, ClockCircleOutlined, CloseOutlined, FireOutlined } from "@ant-design/icons";
import { Tag } from "antd";
import type { CSSProperties } from "react";
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

export function getAppointmentStatusColorVars(status: AppointmentStatus): CSSProperties {
  switch (status) {
    case "completed":
      return {
        "--schedule-entry-border": "#4f8b57",
        "--schedule-entry-background": "linear-gradient(180deg, rgba(123, 181, 113, 0.32), rgba(96, 155, 88, 0.18))",
        "--schedule-entry-selected-ring": "rgba(79, 139, 87, 0.72)",
        "--schedule-entry-icon-color": "#2f6a39",
      } as CSSProperties;
    case "cancelled":
      return {
        "--schedule-entry-border": "#b35d63",
        "--schedule-entry-background":
          "repeating-linear-gradient(135deg, rgba(217, 138, 160, 0.26), rgba(217, 138, 160, 0.26) 8px, rgba(195, 107, 120, 0.34) 8px, rgba(195, 107, 120, 0.34) 16px)",
        "--schedule-entry-selected-ring": "rgba(179, 93, 99, 0.72)",
        "--schedule-entry-icon-color": "#8d3941",
      } as CSSProperties;
    case "burned":
      return {
        "--schedule-entry-border": "#d97706",
        "--schedule-entry-background": "linear-gradient(180deg, rgba(251, 191, 36, 0.3), rgba(217, 119, 6, 0.18))",
        "--schedule-entry-selected-ring": "rgba(217, 119, 6, 0.72)",
        "--schedule-entry-icon-color": "#a24d08",
      } as CSSProperties;
    default:
      return {
        "--schedule-entry-border": "#4e8fc8",
        "--schedule-entry-background": "linear-gradient(180deg, rgba(132, 182, 234, 0.32), rgba(78, 143, 200, 0.18))",
        "--schedule-entry-selected-ring": "rgba(78, 143, 200, 0.72)",
        "--schedule-entry-icon-color": "#2f6f9f",
      } as CSSProperties;
  }
}
