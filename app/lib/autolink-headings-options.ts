import type { ElementContent } from "hast";

export const autolinkHeadingsOptions = {
  behavior: "prepend" as const,
  properties: {
    className: ["anchor"],
    ariaHidden: "true",
    tabIndex: -1,
  },
  content: {
    type: "element",
    tagName: "span",
    properties: { className: ["anchor-icon"] },
    children: [{ type: "text", value: "#" }],
  } satisfies ElementContent,
};
