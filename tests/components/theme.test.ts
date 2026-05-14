// @vitest-environment node
import { describe, it, expect } from "vitest";
import { THEME_SCRIPT } from "@/lib/theme-script-content";

describe("UI-04: Theme script content", () => {
  it("UI-04: contains paste-md-theme localStorage key", () => {
    expect(THEME_SCRIPT).toContain("paste-md-theme");
  });

  it("UI-04: contains classList.toggle with dark class", () => {
    expect(THEME_SCRIPT).toContain("classList.toggle");
    expect(THEME_SCRIPT).toContain("dark");
  });

  it("UI-04: contains prefers-color-scheme media query", () => {
    expect(THEME_SCRIPT).toContain("prefers-color-scheme: dark");
  });

  it("UI-04: wraps logic in try/catch for error handling", () => {
    expect(THEME_SCRIPT).toContain("try");
    expect(THEME_SCRIPT).toContain("catch");
  });
});
