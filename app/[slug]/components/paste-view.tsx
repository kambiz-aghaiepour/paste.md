"use client";

import { useState, useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { CopyButton } from "@/app/components/copy-button";

interface PasteViewProps {
  content: string;
  renderedContent: React.ReactNode;
  expiresAt: number | null;
}

/**
 * Client Component wrapping server-rendered paste content.
 * Injects copy buttons into pre elements via DOM after hydration (D-09).
 */
export function PasteView({ content, renderedContent }: PasteViewProps) {
  const [activeTab, setActiveTab] = useState<"rendered" | "raw">("rendered");
  const contentRef = useRef<HTMLDivElement>(null);
  const rootsRef = useRef<Root[]>([]);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const preElements = container.querySelectorAll("pre");

    for (const pre of preElements) {
      // Skip if already wrapped
      if (pre.parentElement?.classList.contains("relative")) continue;

      // Wrap pre in a relative container for button positioning
      const wrapper = document.createElement("div");
      wrapper.className = "relative group";
      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      // Create a container for the copy button
      const buttonContainer = document.createElement("div");
      buttonContainer.className =
        "absolute top-2 right-2 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150";
      wrapper.appendChild(buttonContainer);

      // Render CopyButton into the container
      const root = createRoot(buttonContainer);
      root.render(
        <CopyButton textContent={pre.textContent ?? ""} />,
      );
      rootsRef.current.push(root);
    }

    return () => {
      for (const root of rootsRef.current) {
        root.unmount();
      }
      rootsRef.current = [];
    };
  }, [activeTab]);

  return (
    <div>
      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("rendered")}
          aria-pressed={activeTab === "rendered"}
          className={`flex-1 py-2 text-sm font-medium text-center min-h-[44px] transition-colors ${
            activeTab === "rendered"
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          }`}
        >
          Rendered
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("raw")}
          aria-pressed={activeTab === "raw"}
          className={`flex-1 py-2 text-sm font-medium text-center min-h-[44px] transition-colors ${
            activeTab === "raw"
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          }`}
        >
          Raw
        </button>
      </div>

      {activeTab === "rendered" ? (
        <div ref={contentRef}>{renderedContent}</div>
      ) : (
        <div className="relative group">
          <pre className="whitespace-pre-wrap break-words rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 dark:text-gray-100 p-4 font-mono text-sm">
            {content}
          </pre>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150">
            <CopyButton textContent={content} />
          </div>
        </div>
      )}
    </div>
  );
}
