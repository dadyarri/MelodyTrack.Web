import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { App as AntdApp } from "antd";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getReleaseHistory } from "@/entities/release";

import { ReleaseNotesModal, ReleaseVersion } from "./ReleaseNotes";

vi.mock("@/entities/release", () => ({
  getReleaseHistory: vi.fn(),
  releaseQueryKeys: { history: () => ["releases", "history", 1] },
}));

const history = {
  currentVersion: "2026.07.1",
  releases: [
    {
      version: "2026.07.1",
      codename: "Accordatura",
      date: "2026-07-29",
      parentVersion: null,
      changes: { new: ["История обновлений"], improved: [], fixed: [], security: [] },
    },
  ],
  page: 1,
  pageSize: 20,
  totalCount: 1,
  totalPages: 1,
  hasNextPage: false,
};

describe("ReleaseNotes", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows release notes from the dedicated button", async () => {
    vi.mocked(getReleaseHistory).mockResolvedValue(history);
    renderReleaseNotes(<ReleaseNotesModal open onClose={vi.fn()} />);
    expect(await screen.findByText("2026.07.1 — Accordatura")).toBeInTheDocument();
    expect(screen.getByText("История обновлений")).toBeInTheDocument();
  });

  it("does not block the screen when the API is unavailable", async () => {
    vi.mocked(getReleaseHistory).mockRejectedValue(new Error("offline"));
    renderReleaseNotes(<ReleaseNotesModal open onClose={vi.fn()} />);
    expect(await screen.findByText("Не удалось загрузить историю обновлений", {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it("renders the version separately from the release-notes button", async () => {
    vi.mocked(getReleaseHistory).mockResolvedValue(history);
    renderReleaseNotes(<ReleaseVersion />);
    expect(await screen.findByText("Версия 2026.07.1")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Что нового" })).not.toBeInTheDocument();
  });
});

function renderReleaseNotes(content: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>{content}</AntdApp>
    </QueryClientProvider>,
  );
}
