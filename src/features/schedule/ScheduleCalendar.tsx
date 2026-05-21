import { SyncOutlined } from "@ant-design/icons";
import { Empty, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { type CSSProperties, type DragEvent, useState } from "react";
import type { Appointment } from "../../api/types";
import { formatDate, TIME_FORMAT } from "../../utils/date";
import { getAppointmentStatusLabel, renderAppointmentStatusIcon } from "./appointmentStatus";
import styles from "./ScheduleCalendar.module.css";

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
    <section className={`${styles.calendar}${draggedAppointmentId ? ` ${styles.dragActive}` : ""}`} aria-busy={loading}>
      <div className={styles.desktop}>
        <div className={styles.header} style={{ gridTemplateColumns: `72px repeat(${String(days.length)}, minmax(144px, 1fr))` }}>
          <div className={styles.corner} />
          {days.map((day) => (
            <div
              className={day.isSame(dayjs(), "day") ? `${styles.dayHeading} ${styles.dayHeadingToday}` : styles.dayHeading}
              key={day.format("YYYY-MM-DD")}
            >
              <span>{formatWeekday(day)}</span>
              <strong>{day.format("D")}</strong>
            </div>
          ))}
        </div>
        <div
          className={styles.grid}
          style={{
            gridTemplateColumns: `72px repeat(${String(days.length)}, minmax(144px, 1fr))`,
            minHeight: hours.length * hourHeight,
          }}
        >
          <div className={styles.timeRail}>
            {hours.map((hour) => (
              <div className={styles.timeSlot} key={hour}>
                {`${hour.toString().padStart(2, "0")}:00`}
              </div>
            ))}
          </div>
          {days.map((day) => (
            /* biome-ignore lint/a11y/noStaticElementInteractions: this column is a pointer drag-and-drop drop zone; keyboard users interact with the hour buttons inside it. */
            <div
              className={styles.dayColumn}
              key={day.format("YYYY-MM-DD")}
              onDragLeave={(event) => {
                handleColumnDragLeave(event, day);
              }}
              onDragOver={(event) => {
                handleColumnDragOver(event, day);
              }}
              onDrop={(event) => {
                handleColumnDrop(event, day);
              }}
            >
              {hours.map((hour) => (
                <button
                  type="button"
                  className={`${styles.hourLine} ${styles.hourSlotButton}${dropTarget?.dayKey === day.format("YYYY-MM-DD") && dropTarget.hour === hour ? ` ${styles.hourSlotDropTarget}` : ""}`}
                  key={hour}
                  aria-label={`Создать запись на ${formatDate(day)} ${hour.toString().padStart(2, "0")}:00`}
                  onClick={() => {
                    onCreateAt(day.hour(hour).minute(0).second(0).millisecond(0));
                  }}
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
      <div className={styles.mobile}>
        {days.map((day) => {
          const dayAppointments = appointmentsByDay.get(day.format("YYYY-MM-DD")) ?? [];
          return (
            <section className={styles.agendaDay} key={day.format("YYYY-MM-DD")}>
              <div className={day.isSame(dayjs(), "day") ? `${styles.agendaHeading} ${styles.agendaHeadingToday}` : styles.agendaHeading}>
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
      className={styles.stack}
      style={
        {
          "--event-top": `${String(top)}px`,
          "--event-height": `${String(height)}px`,
          "--stack-size": String(appointments.length),
          "--stack-expanded-height": `${String(height + expandedOffset * (appointments.length - 1))}px`,
          "--badge-top": `${String(slotTop - top + 4)}px`,
        } as CSSProperties
      }
    >
      {appointments.length > 1 ? <div className={styles.stackBadge}>{appointments.length}</div> : null}
      {appointments.map((item, index) => (
        <button
          type="button"
          className={`${styles.entry} ${styles.event} ${styles.eventStacked} ${styles.entryDraggable} ${getAppointmentClassName(item)}${item.id === selectedAppointmentId ? ` ${styles.entrySelected}` : ""}${item.id === reschedulePendingAppointmentId ? ` ${styles.entryDragDisabled}` : ""}`}
          draggable={reschedulePendingAppointmentId === null}
          style={
            {
              "--stack-index": String(index),
              "--stack-top": `${String(index * stackOffset)}px`,
              "--stack-card-height": `${String(cardHeight)}px`,
              ...getServiceColorVars(item),
            } as CSSProperties
          }
          key={item.id}
          onDragEnd={onDragEnd}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            onDragStart(item);
          }}
          onClick={() => {
            onSelect(item);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect(item);
            }
          }}
        >
          <AppointmentContent appointment={item} density={getStackDensity(appointments.length)} />
        </button>
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
    <button
      type="button"
      className={`${styles.entry} ${styles.agendaItem} ${getAppointmentClassName(appointment)}${isSelected ? ` ${styles.entrySelected}` : ""}`}
      style={getServiceColorVars(appointment) as CSSProperties}
      onClick={() => {
        onSelect(appointment);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(appointment);
        }
      }}
    >
      <AppointmentContent appointment={appointment} showTime />
    </button>
  );
}

function AppointmentContent({
  appointment,
  density = "full",
  showTime = false,
}: {
  appointment: Appointment;
  density?: "full" | "compact" | "dense";
  showTime?: boolean;
}) {
  const start = dayjs(appointment.startDate);
  const end = dayjs(appointment.endDate);
  const clientName = [appointment.client.lastName, appointment.client.firstName].filter(Boolean).join(" ");
  const densityClassName = density === "dense" ? styles.eventContentDense : density === "compact" ? styles.eventContentCompact : "";

  return (
    <div className={`${styles.eventContent} ${densityClassName}`.trim()}>
      <div className={styles.eventTopline}>
        {showTime ? (
          <div className={styles.eventTime}>
            {start.format(TIME_FORMAT)} - {end.format(TIME_FORMAT)}
          </div>
        ) : (
          <div className={styles.eventTitlePrimary}>{clientName}</div>
        )}
        <div className={styles.eventIcons}>
          <span className={styles.eventStatusIcon} title={getAppointmentStatusLabel(appointment.status)}>
            {renderAppointmentStatusIcon(appointment.status)}
          </span>
          {appointment.recurringRule ? (
            <span className={`${styles.eventStatusIcon} ${styles.eventRecurringIcon}`} title="Повторяющаяся запись">
              <SyncOutlined />
            </span>
          ) : null}
        </div>
      </div>
      {showTime ? <div className={styles.eventTitle}>{clientName}</div> : null}
      <div className={styles.eventService}>{appointment.service.name}</div>
      {appointment.provider ? (
        <div className={styles.eventProvider}>
          {appointment.provider.lastName} {appointment.provider.firstName}
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
      const leftRank = getAppointmentStatusRank(left);
      const rightRank = getAppointmentStatusRank(right);
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
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
  switch (appointment.status) {
    case "completed":
      return styles.eventCompleted;
    case "cancelled":
      return styles.eventCanceled;
    case "burned":
      return styles.eventBurned;
    default:
      return styles.eventPlanned;
  }
}

function getAppointmentStatusRank(appointment: Appointment) {
  switch (appointment.status) {
    case "planned":
      return 0;
    case "completed":
      return 1;
    case "burned":
      return 2;
    case "cancelled":
      return 3;
    default:
      return 4;
  }
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
