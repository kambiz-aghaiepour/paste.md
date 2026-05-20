import type { Root, Element, Text } from "hast";
import { visit } from "unist-util-visit";

function extractText(node: Element): string {
  const parts: string[] = [];
  for (const child of node.children) {
    if (child.type === "text") {
      parts.push((child as Text).value);
    } else if (child.type === "element") {
      parts.push(extractText(child as Element));
    }
  }
  return parts.join("");
}

export function rehypeExtractMermaid() {
  return (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "pre" || parent == null || index == null) return;

      const code = node.children.find(
        (child): child is Element =>
          child.type === "element" && child.tagName === "code",
      );
      if (!code) return;

      const classes = code.properties?.className;
      const isMermaid =
        Array.isArray(classes) &&
        classes.some((c) => String(c) === "language-mermaid");
      if (!isMermaid) return;

      const source = extractText(code).replace(/\n$/, "");

      parent.children[index] = {
        type: "element",
        tagName: "div",
        properties: { "data-mermaid-source": source },
        children: [],
      };
    });
  };
}
