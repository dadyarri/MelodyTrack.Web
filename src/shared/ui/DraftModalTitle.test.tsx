import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DraftModalTitle } from "./DraftModalTitle";

describe("DraftModalTitle", () => {
  it.each([
    ["loading", "Загружаем черновик…"],
    ["pending", "Сохраняем черновик…"],
    ["saved", "Черновик сохранён"],
    ["failed", "Не удалось сохранить черновик"],
  ] as const)("shows the %s persistence state", (saveStatus, label) => {
    render(<DraftModalTitle title="Новая запись" restored={false} saveStatus={saveStatus} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("makes restoration explicit after hydration completes", () => {
    render(<DraftModalTitle title="Новая запись" restored saveStatus="saved" />);

    expect(screen.getByText("Черновик восстановлен")).toBeInTheDocument();
  });
});
