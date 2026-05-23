import type { Client, ClientHistory } from "@/api/types";
import { getAppointmentStatusLabel } from "@/features/schedule/appointmentStatus";
import { formatPhone, getPhoneUri, normalizeSocialLink } from "./contact";

export type ClientWithOptionalContacts = Client & {
  telegram?: string | null;
  vk?: string | null;
  phone?: string | null;
};

export function formatClientName(client: Pick<Client, "firstName" | "lastName" | "patronymic">) {
  return [client.lastName, client.firstName, client.patronymic].filter(Boolean).join(" ");
}

export function getClientContactValue(client: ClientWithOptionalContacts, key: "telegram" | "vk" | "phone") {
  return client.contacts?.[key] ?? client[key] ?? undefined;
}

export function renderClientPhoneLink(value?: string | null) {
  const uri = getPhoneUri(value);
  if (!uri) {
    return null;
  }

  return <a href={uri}>{formatPhone(value)}</a>;
}

export function renderClientSocialLink(value: string | null | undefined, type: "telegram" | "vk") {
  const normalized = normalizeSocialLink(value, type);
  if (!normalized) {
    return null;
  }

  return (
    <a href={normalized} target="_blank" rel="noreferrer">
      @{getSocialHandle(normalized)}
    </a>
  );
}

export function renderClientHistoryAppointmentStatus(appointment: ClientHistory["recentAppointments"][number]) {
  return getAppointmentStatusLabel(appointment.status);
}

function getSocialHandle(value: string) {
  return (
    value
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split(/[/?#]/)[1] ?? ""
  );
}
