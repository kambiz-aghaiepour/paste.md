// @vitest-environment jsdom
import { Marp } from "@marp-team/marp-core";
import { fireEvent, render } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { MarpViewer } from "../../app/components/marp-viewer";

vi.mock("@marp-team/marp-core/browser", () => ({
  default: () => ({ update: vi.fn(), cleanup: vi.fn() }),
}));

const deck = new Marp({ script: false }).render(
  "# First\n\n---\n\n# Second\n\n---\n\n# Third",
).html;

describe("Marp slide navigation", () => {
  it("changes the visible slide as well as the counter when Next is clicked", () => {
    const { container, getByRole, getByText } = render(
      <MarpViewer html={deck} total={3} />,
    );
    const slides = () =>
      Array.from(
        container.querySelectorAll<SVGElement>("svg[data-marpit-svg]"),
      );
    expect(slides().map((slide) => slide.style.display)).toEqual([
      "block",
      "none",
      "none",
    ]);
    const firstSlide = slides()[0];
    fireEvent.click(getByRole("button", { name: "Next slide" }));
    expect(getByText("2 / 3")).toBeDefined();
    expect(slides()[0]).toBe(firstSlide);
    expect(slides().map((slide) => slide.style.display)).toEqual([
      "none",
      "block",
      "none",
    ]);
  });

  it("supports previous/next and keyboard navigation with bounds in Strict Mode", () => {
    const { container, getByRole, getByText } = render(
      <StrictMode>
        <MarpViewer html={deck} total={3} />
      </StrictMode>,
    );
    const expectSlide = (index: number) => {
      expect(getByText(`${index + 1} / 3`)).toBeDefined();
      expect(
        Array.from(
          container.querySelectorAll<SVGElement>("svg[data-marpit-svg]"),
        ).map((slide) => slide.style.display),
      ).toEqual([0, 1, 2].map((i) => (i === index ? "block" : "none")));
    };
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expectSlide(1);
    fireEvent.keyDown(window, { key: "End" });
    expectSlide(2);
    expect(
      (getByRole("button", { name: "Next slide" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.keyDown(window, { key: "PageDown" });
    expectSlide(2);
    fireEvent.click(getByRole("button", { name: "Previous slide" }));
    expectSlide(1);
    fireEvent.keyDown(window, { key: "Home" });
    expectSlide(0);
    expect(
      (getByRole("button", { name: "Previous slide" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expectSlide(0);
    fireEvent.keyDown(window, { key: " " });
    expectSlide(1);
    fireEvent.keyDown(window, { key: "PageUp" });
    expectSlide(0);
  });

  it("captures replacement markup and resets the slide counter", () => {
    const { container, getByRole, getByText, rerender } = render(
      <MarpViewer html={deck} total={3} />,
    );
    fireEvent.keyDown(window, { key: "End" });
    const replacement = new Marp({ script: false }).render(
      "# Replacement\n\n---\n\n# Last",
    ).html;
    rerender(<MarpViewer html={replacement} total={2} />);
    expect(getByText("1 / 2")).toBeDefined();
    fireEvent.click(getByRole("button", { name: "Next slide" }));
    expect(getByText("2 / 2")).toBeDefined();
    expect(
      Array.from(
        container.querySelectorAll<SVGElement>("svg[data-marpit-svg]"),
      ).map((slide) => slide.style.display),
    ).toEqual(["none", "block"]);
  });

  it("keeps an empty deck at zero slides when navigating with the keyboard", () => {
    const { getByText, getByRole } = render(<MarpViewer html="" total={0} />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(getByText("0 / 0")).toBeDefined();
    expect(
      (getByRole("button", { name: "Previous slide" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
