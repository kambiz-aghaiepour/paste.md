import type { Components } from "react-markdown";
import { MermaidDiagram } from "./mermaid-diagram";

export const markdownComponents: Components = {
  div({ node, children, ...props }) {
    const mermaidSource = (props as Record<string, unknown>)[
      "data-mermaid-source"
    ];
    if (typeof mermaidSource === "string") {
      return <MermaidDiagram chart={mermaidSource} />;
    }
    return <div {...props}>{children}</div>;
  },
};
