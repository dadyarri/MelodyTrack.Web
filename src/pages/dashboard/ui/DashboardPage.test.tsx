import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Appointment } from "@/entities/appointment";

import { DashboardScheduleItem } from "./DashboardPage";

const appointment: Appointment = {
  id: "01JTESTAPPOINTMENT0000000000",
  client: {
    id: "01JTESTCLIENT00000000000000",
    firstName: "Анна",
    lastName: "Иванова",
    contacts: {
      telegram: "javascript:alert(document.domain)",
      vk: "javascript:alert(document.domain)",
    },
  },
  service: {
    id: "01JTESTSERVICE0000000000000",
    name: "Урок",
  },
  startDate: "2026-07-27T10:00:00Z",
  endDate: "2026-07-27T11:00:00Z",
  status: "planned",
};

describe("DashboardScheduleItem", () => {
  it.each(["Telegram", "VK"])("does not render an unsafe stored %s contact", (contactTitle) => {
    render(<DashboardScheduleItem appointment={appointment} />);

    expect(screen.queryByTitle(contactTitle)).not.toBeInTheDocument();
  });

  it("renders normalized Telegram and VK contacts", () => {
    render(
      <DashboardScheduleItem
        appointment={{
          ...appointment,
          client: {
            ...appointment.client,
            contacts: {
              telegram: "@valid_name",
              vk: "https://vk.com/valid.name",
            },
          },
        }}
      />,
    );

    expect(screen.getByTitle("Telegram")).toHaveAttribute("href", "tg://resolve?domain=valid_name");
    expect(screen.getByTitle("VK")).toHaveAttribute("href", "https://vk.com/valid.name");
  });
});
