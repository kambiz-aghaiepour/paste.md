import { describe, it, expect } from "vitest";
import {
  isMarpDeck,
  parsePasteIdAndView,
  parseFrontmatter,
  extractFrontmatterTitle,
} from "../../lib/marp";

describe("parseFrontmatter", () => {
  it("extracts the frontmatter body", () => {
    expect(parseFrontmatter("---\nmarp: true\ntitle: Hi\n---\n# Body")).toBe(
      "marp: true\ntitle: Hi",
    );
  });

  it("returns null when there is no frontmatter", () => {
    expect(parseFrontmatter("# Hello")).toBeNull();
  });

  it("strips a leading BOM", () => {
    expect(parseFrontmatter("\uFEFF---\nmarp: true\n---\n# Hi")).toBe(
      "marp: true",
    );
  });
});

describe("isMarpDeck", () => {
  it("returns true for `marp: true` frontmatter", () => {
    expect(isMarpDeck("---\nmarp: true\n---\n\n# Hello")).toBe(true);
  });

  it("returns true for `marp: yes`", () => {
    expect(isMarpDeck("---\nmarp: yes\n---\n# Hi")).toBe(true);
  });

  it("returns false for `marp: false`", () => {
    expect(isMarpDeck("---\nmarp: false\n---\n# Hi")).toBe(false);
  });

  it("returns false when there is no frontmatter", () => {
    expect(isMarpDeck("# Hello")).toBe(false);
  });

  it("returns false for non-marp frontmatter", () => {
    expect(isMarpDeck("---\ntitle: x\nauthor: y\n---\n# Hi")).toBe(false);
  });

  it("does not match a nested marp key", () => {
    expect(isMarpDeck("---\nconfig:\n  marp: true\n---\n# Hi")).toBe(false);
  });
});

describe("extractFrontmatterTitle", () => {
  it("extracts the title value", () => {
    expect(
      extractFrontmatterTitle('---\nmarp: true\ntitle: "My Deck"\n---\n# x'),
    ).toBe("My Deck");
  });

  it("returns undefined when there is no title", () => {
    expect(
      extractFrontmatterTitle("---\nmarp: true\n---\n# x"),
    ).toBeUndefined();
  });
});

describe("parsePasteIdAndView", () => {
  it("returns the plain id and no forced view", () => {
    expect(parsePasteIdAndView("abc12345")).toEqual({
      id: "abc12345",
      forcedView: null,
    });
  });

  it("parses a `.marp` suffix as forced presentation", () => {
    expect(parsePasteIdAndView("abc12345.marp")).toEqual({
      id: "abc12345",
      forcedView: "presentation",
    });
  });

  it("parses a `.md` suffix as forced document", () => {
    expect(parsePasteIdAndView("abc12345.md")).toEqual({
      id: "abc12345",
      forcedView: "document",
    });
  });
});
