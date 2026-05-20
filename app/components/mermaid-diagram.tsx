"use client";

import { useState, useEffect, useRef, useId } from "react";

interface MermaidDiagramProps {
  chart: string;
}

type RenderState =
  | { status: "loading" }
  | { status: "rendered"; svg: string }
  | { status: "error" };

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const [state, setState] = useState<RenderState>({ status: "loading" });
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, "-");

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const { default: mermaid } = await import("mermaid");
        if (cancelled) return;

        const isDark =
          document.documentElement.classList.contains("dark");
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "default",
          fontFamily: "inherit",
        });

        const { svg } = await mermaid.render(`mermaid-${id}`, chart);
        if (cancelled) return;
        setState({ status: "rendered", svg });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    }

    render();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          setState({ status: "loading" });
          render();
          break;
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [chart, id]);

  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[100px] rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-400 dark:text-gray-500">
        Loading diagram...
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <pre className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-4 text-sm">
        <code>{chart}</code>
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      data-mermaid-source={chart}
      className="flex justify-center overflow-x-auto py-4 [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: state.svg }}
    />
  );
}
