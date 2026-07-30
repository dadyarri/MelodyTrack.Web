import { describe, expect, it } from "vitest";

import type { AppUser } from "@/entities/session";

import { getAvailableNavItems } from "./navigation";

describe("statistics navigation", () => {
  it.each([
    ["regular user", { isAdmin: false, isSuperuser: false, isClientPortal: false }, false],
    ["admin", { isAdmin: true, isSuperuser: false, isClientPortal: false }, true],
    ["superuser", { isAdmin: false, isSuperuser: true, isClientPortal: false }, true],
    ["client", { isAdmin: false, isSuperuser: false, isClientPortal: true }, false],
  ])("shows the three report areas to a %s when appropriate", (_, flags, expected) => {
    const reportItems = getAvailableNavItems(flags as AppUser).filter((item) => item.group === "stats");

    expect(reportItems.map((item) => item.key)).toEqual(expected ? ["/statistics/work", "/statistics/finance", "/statistics/clients"] : []);
  });
});
