import { describe, expect, it, vi } from "vitest";

import { createRoutePrefetcher } from "./routePrefetch";

describe("route prefetch", () => {
  it("loads a known route once across repeated pointer and focus intent", async () => {
    const loadSchedule = vi.fn(() => Promise.resolve({}));
    const prefetch = createRoutePrefetcher({ "/schedule": loadSchedule });

    await Promise.all([prefetch("/schedule"), prefetch("/schedule?week=2026-07-27")]);

    expect(loadSchedule).toHaveBeenCalledOnce();
  });

  it("ignores unknown routes and allows retry after a failed speculative request", async () => {
    const loadCourses = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({});
    const prefetch = createRoutePrefetcher({ "/courses": loadCourses });

    await expect(prefetch("/missing")).resolves.toBeUndefined();
    await expect(prefetch("/courses")).resolves.toBeUndefined();
    await expect(prefetch("/courses")).resolves.toBeUndefined();

    expect(loadCourses).toHaveBeenCalledTimes(2);
  });
});
