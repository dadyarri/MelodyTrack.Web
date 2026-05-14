import { CheckOutlined, CloseOutlined, PlusOutlined, SyncOutlined } from "@ant-design/icons";
import { Empty, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { type CSSProperties, type DragEvent, useState } from "react";
import type { Appointment } from "../../api/types";
import { formatDate, TIME_FORMAT } from "../../utils/date";

const defaultStartHour = 10;
const defaultEndHour = 20;
const hourHeight = 72;
const stackOffset = 8;
const serviceColors = [
  { background: "#84b6ea", border: "#4e8fc8" },
  { background: "#d8b35a", border: "#b8860b" },
  { background: "#7cb071", border: "#5f8f4d" },
  { background: "#9a84dc", border: "#7b61c8" },
  { background: "#d98aa0", border: "#c85f7d" },
  { background: "#6eb79e", border: "#3f9b7c" },
];

export function AppointmentsCalendar({
  appointments,
  loading,
  range,
  onCreateAt,
  onReschedule,
  onSelect,
  reschedulePendingAppointmentId,
  selectedAppointmentId,
}: {
  appointments: Appointment[];
  loading: boolean;
  range: [Dayjs, Dayjs];
  onCreateAt: (startDate: Dayjs) => void;
  onReschedule: (appointment: Appointment, startDate: Dayjs) => void;
  onSelect: (appointment: Appointment) => void;
  reschedulePendingAppointmentId: string | null;
  selectedAppointmentId: string | null;
}) {
  const days = getDays(range);
  const hours = getHours();
  const appointmentsByDay = groupAppointmentsByDay(appointments);
  const [draggedAppointmentId, setDraggedAppointmentId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ dayKey: string; hour: number } | null>(null);
  const draggedAppointment = draggedAppointmentId
    ? (appointments.find((appointment) => appointment.id === draggedAppointmentId) ?? null)
    : null;

  const handleAppointmentDragStart = (appointment: Appointment) => {
    if (reschedulePendingAppointmentId) {
      return;
    }

    setDraggedAppointmentId(appointment.id);
  };

  const handleAppointmentDragEnd = () => {
    setDraggedAppointmentId(null);
    setDropTarget(null);
  };

  const handleColumnDragOver = (event: DragEvent<HTMLDivElement>, day: Dayjs) => {
    if (!draggedAppointment) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const nextHour = getDropHour(event, hours[0], hours[hours.length - 1]);
    setDropTarget((current) => {
      const nextTarget = { dayKey: day.format("YYYY-MM-DD"), hour: nextHour };
      return current?.dayKey === nextTarget.dayKey && current.hour === nextTarget.hour ? current : nextTarget;
    });
  };

  const handleColumnDrop = (event: DragEvent<HTMLDivElement>, day: Dayjs) => {
    if (!draggedAppointment) {
      return;
    }

    event.preventDefault();

    const nextStartDate = buildRescheduledStartDate(
      day,
      dayjs(draggedAppointment.startDate),
      getDropHour(event, hours[0], hours[hours.length - 1]),
    );
    if (!nextStartDate.isSame(dayjs(draggedAppointment.startDate))) {
      onReschedule(draggedAppointment, nextStartDate);
    }

    setDraggedAppointmentId(null);
    setDropTarget(null);
  };

  const handleColumnDragLeave = (event: DragEvent<HTMLDivElement>, day: Dayjs) => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
      return;
    }

    setDropTarget((current) => (current?.dayKey === day.format("YYYY-MM-DD") ? null : current));
  };

  return (
    <section className="schedule-calendar" aria-busy={loading}>
      <div className="schedule-calendar-desktop">
        <div className="schedule-calendar-header" style={{ gridTemplateColumns: `72px repeat(${days.length}, minmax(144px, 1fr))` }}>
          <div className="schedule-calendar-corner" />
          {days.map((day) => (
            <div
              className={day.isSame(dayjs(), "day") ? "schedule-day-heading schedule-day-heading-today" : "schedule-day-heading"}
              key={day.format("YYYY-MM-DD")}
            >
              <span>{formatWeekday(day)}</span>
              <strong>{day.format("D")}</strong>
            </div>
          ))}
        </div>
        <div
          className="schedule-calendar-grid"
          style={{
            gridTemplateColumns: `72px repeat(${days.length}, minmax(144px, 1fr))`,
            minHeight: hours.length * hourHeight,
          }}
        >
          <div className="schedule-time-rail">
            {hours.map((hour) => (
              <div className="schedule-time-slot" key={hour}>
                {`${hour.toString().padStart(2, "0")}:00`}
              </div>
            ))}
          </div>
          {days.map((day) => (
            <div
              className="schedule-day-column"
              key={day.format("YYYY-MM-DD")}
              onDragLeave={(event) => handleColumnDragLeave(event, day)}
              onDragOver={(event) => handleColumnDragOver(event, day)}
              onDrop={(event) => handleColumnDrop(event, day)}
            >
              {hours.map((hour) => (
                <button
                  type="button"
                  className={`schedule-hour-line schedule-hour-slot-button${dropTarget?.dayKey === day.format("YYYY-MM-DD") && dropTarget.hour === hour ? " schedule-hour-slot-drop-target" : ""}`}
                  key={hour}
                  aria-label={`Создать запись на ${formatDate(day)} ${hour.toString().padStart(2, "0")}:00`}
                  onClick={() => onCreateAt(day.hour(hour).minute(0).second(0).millisecond(0))}
                />
              ))}
              {groupAppointmentsBySlot(appointmentsByDay.get(day.format("YYYY-MM-DD")) ?? []).map((appointmentsInSlot) => (
                <AppointmentStack
                  appointments={appointmentsInSlot}
                  day={day}
                  startHour={hours[0]}
                  key={appointmentsInSlot.map((appointment) => appointment.id).join(":")}
                  onDragEnd={handleAppointmentDragEnd}
                  onDragStart={handleAppointmentDragStart}
                  onSelect={onSelect}
                  reschedulePendingAppointmentId={reschedulePendingAppointmentId}
                  selectedAppointmentId={selectedAppointmentId}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="schedule-calendar-mobile">
        {days.map((day) => {
          const dayAppointments = appointmentsByDay.get(day.format("YYYY-MM-DD")) ?? [];
          return (
            <section className="schedule-agenda-day" key={day.format("YYYY-MM-DD")}>
              <div
                className={day.isSame(dayjs(), "day") ? "schedule-agenda-heading schedule-agenda-heading-today" : "schedule-agenda-heading"}
              >
                <Typography.Text strong>{formatDate(day)}</Typography.Text>
                <Typography.Text type="secondary">{formatWeekday(day)}</Typography.Text>
              </div>
              {dayAppointments.length > 0 ? (
                dayAppointments.map((appointment) => (
                  <AppointmentAgendaItem
                    appointment={appointment}
                    isSelected={appointment.id === selectedAppointmentId}
                    key={appointment.id}
                    onSelect={onSelect}
                  />
                ))
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Нет записей" />
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function AppointmentStack({
  appointments,
  day,
  onDragEnd,
  onDragStart,
  startHour,
  onSelect,
  reschedulePendingAppointmentId,
  selectedAppointmentId,
}: {
  appointments: Appointment[];
  day: Dayjs;
  onDragEnd: () => void;
  onDragStart: (appointment: Appointment) => void;
  startHour: number;
  onSelect: (appointment: Appointment) => void;
  reschedulePendingAppointmentId: string | null;
  selectedAppointmentId: string | null;
}) {
  const appointment = appointments[0];
  const start = dayjs(appointment.startDate);
  const longestEnd = appointments.reduce((latest, current) => {
    const currentEnd = dayjs(current.endDate);
    return currentEnd.isAfter(latest) ? currentEnd : latest;
  }, dayjs(appointment.endDate));
  const top = Math.max(0, (start.diff(day.hour(startHour).minute(0).second(0), "minute") / 60) * hourHeight);
  const height = Math.max(48, (longestEnd.diff(start, "minute") / 60) * hourHeight);
  const totalOffset = appointments.length > 1 ? stackOffset * (appointments.length - 1) : 0;
  const cardHeight = Math.max(48, height - totalOffset);
  const expandedOffset = 56;
  const slotTop = Math.floor(top / hourHeight) * hourHeight;

  return (
    <div
      className="schedule-stack"
      style={
        {
          "--event-top": `${top}px`,
          "--event-height": `${height}px`,
          "--stack-size": appointments.length,
          "--stack-expanded-height": `${height + expandedOffset * (appointments.length - 1)}px`,
          "--badge-top": `${slotTop - top + 4}px`,
        } as CSSProperties
      }
    >
      {appointments.length > 1 ? <div className="schedule-stack-badge">{appointments.length}</div> : null}
      {appointments.map((item, index) => (
        <article
          role="button"
          tabIndex={0}
          className={`schedule-entry schedule-event schedule-event-stacked schedule-entry-draggable ${getAppointmentClassName(item)}${item.id === selectedAppointmentId ? " schedule-entry-selected" : ""}${item.id === reschedulePendingAppointmentId ? " schedule-entry-drag-disabled" : ""}`}
          draggable={reschedulePendingAppointmentId === null}
          style={
            {
              "--stack-index": index,
              "--stack-top": `${index * stackOffset}px`,
              "--stack-card-height": `${cardHeight}px`,
              ...getServiceColorVars(item),
            } as CSSProperties
          }
          key={item.id}
          onDragEnd={onDragEnd}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            onDragStart(item);
          }}
          onClick={() => onSelect(item)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect(item);
            }
          }}
        >
          <AppointmentContent appointment={item} density={getStackDensity(appointments.length)} />
        </article>
      ))}
    </div>
  );
}

function AppointmentAgendaItem({
  appointment,
  isSelected,
  onSelect,
}: {
  appointment: Appointment;
  isSelected: boolean;
  onSelect: (appointment: Appointment) => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      className={`schedule-entry schedule-agenda-item ${getAppointmentClassName(appointment)}${isSelected ? " schedule-entry-selected" : ""}`}
      style={getServiceColorVars(appointment) as CSSProperties}
      onClick={() => onSelect(appointment)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(appointment);
        }
      }}
    >
      <AppointmentContent appointment={appointment} />
    </article>
  );
}

function AppointmentContent({ appointment, density = "full" }: { appointment: Appointment; density?: "full" | "compact" | "dense" }) {
  const start = dayjs(appointment.startDate);
  const end = dayjs(appointment.endDate);
  const clientName = [appointment.client.lastName, appointment.client.firstName].filter(Boolean).join(" ");
  const showProvider = density === "full" && appointment.provider;
  const showService = density !== "dense";

  return (
    <div className={`schedule-event-content schedule-event-content-${density}`}>
      <div className="schedule-event-topline">
        <div className="schedule-event-time">
          {start.format(TIME_FORMAT)} - {end.format(TIME_FORMAT)}
        </div>
        <div className="schedule-event-icons">
          <span className="schedule-event-status-icon" title={getAppointmentStatusLabel(appointment)}>
            {renderAppointmentStatusIcon(appointment)}
          </span>
          {appointment.recurringRule ? (
            <span className="schedule-event-status-icon schedule-event-recurring-icon" title="Повторяющаяся запись">
              <SyncOutlined />
            </span>
          ) : null}
        </div>
      </div>
      <div className="schedule-event-title">{clientName}</div>
      {showService ? (
        <div className="schedule-event-service">
          {appointment.service.name}
          {showProvider ? ` · ${appointment.provider?.lastName} ${appointment.provider?.firstName}` : ""}
        </div>
      ) : null}
    </div>
  );
}

function getDays(range: [Dayjs, Dayjs]) {
  const days: Dayjs[] = [];
  let cursor = range[0].startOf("day");
  const end = range[1].startOf("day");
  while (cursor.isBefore(end) || cursor.isSame(end, "day")) {
    days.push(cursor);
    cursor = cursor.add(1, "day");
  }
  return days;
}

function getHours() {
  return Array.from({ length: defaultEndHour - defaultStartHour }, (_, index) => defaultStartHour + index);
}

function groupAppointmentsByDay(appointments: Appointment[]) {
  return appointments.reduce((map, appointment) => {
    const key = dayjs(appointment.startDate).format("YYYY-MM-DD");
    const items = map.get(key) ?? [];
    items.push(appointment);
    items.sort((a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf());
    map.set(key, items);
    return map;
  }, new Map<string, Appointment[]>());
}

function groupAppointmentsBySlot(appointments: Appointment[]) {
  const groups = new Map<string, Appointment[]>();

  for (const appointment of appointments) {
    const key = dayjs(appointment.startDate).format("YYYY-MM-DDTHH:mm");
    const items = groups.get(key) ?? [];
    items.push(appointment);
    groups.set(key, items);
  }

  return [...groups.values()].map((items) =>
    items.sort((left, right) => {
      if (left.isCanceled !== right.isCanceled) {
        return Number(left.isCanceled) - Number(right.isCanceled);
      }

      if (left.isCompleted !== right.isCompleted) {
        return Number(left.isCompleted) - Number(right.isCompleted);
      }

      return dayjs(left.endDate).valueOf() - dayjs(right.endDate).valueOf();
    }),
  );
}

function formatWeekday(day: Dayjs) {
  return day.format("dd").toUpperCase();
}

function getStackDensity(stackSize: number): "compact" | "dense" {
  return stackSize >= 3 ? "dense" : "compact";
}

function getAppointmentClassName(appointment: Appointment) {
  if (appointment.isCanceled) {
  return "schedule-event-canceled";
  }
  if (appointment.isCompleted) {
  return "schedule-event-completed";
  }
  return "schedule-event-planned";
}

function renderAppointmentStatusIcon(appointment: Appointment) {
  if (appointment.isCanceled) {
    return <CloseOutlined />;
  }
  if (appointment.isCompleted) {
    return <CheckOutlined />;
  }
  return <PlusOutlined />;
}

function getAppointmentStatusLabel(appointment: Appointment) {
  if (appointment.isCanceled) {
    return "Отменена";
  }
  if (appointment.isCompleted) {
    return "Завершена";
  }
  return "Запланирована";
}

function getServiceColorVars(appointment: Appointment) {
  const color = serviceColors[getStableColorIndex(appointment.service.name, serviceColors.length)];
  return {
    "--service-background": color.background,
    "--service-border": color.border,
  };
}

function getStableColorIndex(value: string, modulo: number) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % modulo;
  }
  return hash;
}

function getDropHour(event: DragEvent<HTMLDivElement>, startHour: number, endHour: number) {
  const bounds = event.currentTarget.getBoundingClientRect();
  const offset = Math.max(0, event.clientY - bounds.top);
  const relativeHour = Math.floor(offset / hourHeight);
  return Math.min(endHour, Math.max(startHour, startHour + relativeHour));
}

function buildRescheduledStartDate(day: Dayjs, originalStart: Dayjs, nextHour: number) {
  return day.hour(nextHour).minute(originalStart.minute()).second(originalStart.second()).millisecond(originalStart.millisecond());
}
