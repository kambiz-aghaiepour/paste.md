// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarpRenderer } from "../../app/components/marp-renderer";

function renderDeck(content: string) {
  const template = document.createElement("template");
  template.innerHTML = renderToStaticMarkup(<MarpRenderer content={content} />);
  return template.content;
}

describe("Marp HTML rendering", () => {
  it("preserves styled HTML layouts and content", () => {
    const deck = renderDeck(`---
marp: true
---
# Styled content

<div class="columns" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; color: red">
<span style="font-size: 32px; font-weight: bold">HTML content</span>
</div>`);
    const columns = deck.querySelector<HTMLElement>(".columns");
    expect(columns?.style.display).toBe("grid");
    expect(columns?.style.gridTemplateColumns).toBe("1fr 1fr");
    expect(columns?.style.gap).toBe("2rem");
    expect(columns?.style.color).toBe("red");
    expect(columns?.querySelector("span")?.style.fontSize).toBe("32px");
  });

  it("renders static inline SVG without counting it as a slide", () => {
    const deck = renderDeck(`# Diagram

<svg class="diagram" viewBox="0 0 100 100" width="100" height="100" aria-label="Circle">
<defs><linearGradient id="paint"><stop offset="0%" stop-color="red" /></linearGradient></defs>
<circle cx="50" cy="50" r="40" fill="url(#paint)" />
<text x="50" y="50" text-anchor="middle">SVG content</text>
</svg>

---

# Second`);
    expect(deck.querySelector("svg.diagram")?.getAttribute("viewBox")).toBe(
      "0 0 100 100",
    );
    expect(deck.querySelector("svg.diagram circle")?.getAttribute("fill")).toBe(
      "url(#paint)",
    );
    expect(deck.querySelector("svg.diagram text")?.textContent).toBe(
      "SVG content",
    );
    expect(deck.querySelector("[aria-live]")?.textContent).toBe("1 / 2");
  });

  it("keeps executable HTML and unsafe URLs disabled", () => {
    const deck = renderDeck(`# Untrusted content

<script>alert(1)</script>
<iframe src="https://example.com"></iframe>
<div onclick="alert(1)">Safe content</div>
<a href="javascript:alert(1)">Unsafe link</a>
<img src="javascript:alert(1)" onerror="alert(1)">
<svg onload="alert(1)" data-marpit-svg=""><circle onclick="alert(1)" fill="url(https://example.com/image.svg)"></circle><animate attributeName="href" values="javascript:alert(1)"></animate></svg>`);
    expect(
      deck.querySelector(
        "script, iframe, animate, [onclick], [onload], [onerror]",
      ),
    ).toBeNull();
    expect(
      deck.querySelector('a[href^="javascript:"], img[src^="javascript:"]'),
    ).toBeNull();
    expect(deck.querySelector("circle")?.getAttribute("fill") || "").toBe("");
    expect(deck.querySelectorAll("svg[data-marpit-svg]")).toHaveLength(1);
  });

  it.each([
    "background: url(javascript:alert(1))",
    "background: u\\72l(https://example.com/image.png)",
    "background: u/**/rl(https://example.com/image.png)",
    "width: expression(alert(1))",
    "behavior: url(test.htc)",
    "-moz-binding: url(test.xml)",
    "background: image('https://example.com/image.svg')",
    "background: src('https://example.com/image.svg')",
    "background: image-set('https://example.com/image.png' 1x)",
  ])("filters unsafe inline CSS: %s", (style) => {
    const deck = renderDeck(
      `<div class="unsafe" style="${style}">Content</div>`,
    );
    expect(deck.querySelector(".unsafe")?.getAttribute("style") || "").toBe("");
  });

  it("filters SVG embeds, animation, obfuscated URLs and foreign HTML", () => {
    const deck = renderDeck(`<svg class="untrusted">
<image href="https://example.com/image.svg" />
<use xlink:href="https://example.com/image.svg#icon" />
<foreignObject><div onclick="alert(1)">Untrusted</div></foreignObject>
<set attributeName="href" to="javascript:alert(1)" />
<circle fill="u\\72l(https://example.com/image.svg)" stroke="u/**/rl(https://example.com/image.svg)" />
</svg>

<a href="&#106;avascript:alert(1)">Link</a>`);
    expect(
      deck.querySelector(
        "svg.untrusted image, svg.untrusted use, svg.untrusted foreignObject, svg.untrusted set, [onclick]",
      ),
    ).toBeNull();
    expect(
      deck.querySelector("svg.untrusted circle")?.getAttribute("fill") || "",
    ).toBe("");
    expect(
      deck.querySelector("svg.untrusted circle")?.getAttribute("stroke") || "",
    ).toBe("");
    expect(deck.querySelector('a[href^="javascript:"]')).toBeNull();
  });
});
