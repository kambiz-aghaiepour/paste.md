// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { createElement } from "react";
import { CopyButton } from "@/app/components/copy-button";

describe("UI-03: Copy button behavior", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("UI-03: displays Copy code aria-label initially", () => {
    const { getByRole } = render(
      createElement(CopyButton, { textContent: "const x = 1;" }),
    );

    const button = getByRole("button");
    expect(button.getAttribute("aria-label")).toBe("Copy code");
  });

  it("UI-03: calls navigator.clipboard.writeText with provided textContent", async () => {
    const { getByRole } = render(
      createElement(CopyButton, { textContent: "const x = 1;" }),
    );

    const button = getByRole("button");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("const x = 1;");
  });

  it("UI-03: displays Copied aria-label after click", async () => {
    const { getByRole } = render(
      createElement(CopyButton, { textContent: "const x = 1;" }),
    );

    const button = getByRole("button");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(button.getAttribute("aria-label")).toBe("Copied");
  });

  it("UI-03: reverts aria-label to Copy code after 2 seconds", async () => {
    const { getByRole } = render(
      createElement(CopyButton, { textContent: "const x = 1;" }),
    );

    const button = getByRole("button");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(button.getAttribute("aria-label")).toBe("Copied");

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(button.getAttribute("aria-label")).toBe("Copy code");
  });
});
