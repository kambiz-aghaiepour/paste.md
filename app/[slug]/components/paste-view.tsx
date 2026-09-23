"use client";

import { useState, useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { CopyButton } from "@/app/components/copy-button";

type Tab = "presentation" | "document" | "raw";

interface PasteViewProps {
  content: string;
  renderedContent: React.ReactNode;
  /** Optional Marp slides. When present, a "Presentation" tab is shown. */
  presentationContent?: React.ReactNode;
  defaultTab?: Tab;
  expiresAt: number | null;
}

/**
 * Client Component wrapping server-rendered paste content.
 * Injects copy buttons into pre elements via DOM after hydration (D-09).
 */
export function PasteView({
  content,
  renderedContent,
  presentationContent,
  defaultTab,
}: PasteViewProps) {
  const hasPresentation = Boolean(presentationContent);
  const tabs: Tab[] = hasPresentation
    ? ["presentation", "document", "raw"]
    : ["document", "raw"];

  const initialTab: Tab =
    defaultTab && tabs.includes(defaultTab) ? defaultTab : "document";

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const contentRef = useRef<HTMLDivElement>(null);
  const rootsRef = useRef<Root[]>([]);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const preElements = container.querySelectorAll("pre");

    for (const pre of preElements) {
      if (pre.parentElement?.classList.contains("relative")) continue;

      const wrapper = document.createElement("div");
      wrapper.className = "relative group";
      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      const buttonContainer = document.createElement("div");
      buttonContainer.className =
        "absolute top-2 right-2 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150";
      wrapper.appendChild(buttonContainer);

      const root = createRoot(buttonContainer);
      root.render(<CopyButton textContent={pre.textContent ?? ""} />);
      rootsRef.current.push(root);
    }

    const mermaidDiagrams = container.querySelectorAll<HTMLElement>(
      "[data-mermaid-source]",
    );

    for (const diagram of mermaidDiagrams) {
      if (diagram.parentElement?.classList.contains("relative")) continue;

      const wrapper = document.createElement("div");
      wrapper.className = "relative group";
      diagram.parentNode?.insertBefore(wrapper, diagram);
      wrapper.appendChild(diagram);

      const buttonContainer = document.createElement("div");
      buttonContainer.className =
        "absolute top-2 right-2 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150";
      wrapper.appendChild(buttonContainer);

      const source = diagram.getAttribute("data-mermaid-source") ?? "";
      const root = createRoot(buttonContainer);
      root.render(<CopyButton textContent={source} />);
      rootsRef.current.push(root);
    }

    return () => {
      for (const root of rootsRef.current) {
        root.unmount();
      }
      rootsRef.current = [];
    };
  }, [activeTab]);

  const tabLabels: Record<Tab, string> = {
    presentation: "Presentation",
    document: "Rendered",
    raw: "Raw",
  };

  return (
    <div>
      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            aria-pressed={activeTab === tab}
            className={`flex-1 py-2 text-sm font-medium text-center min-h-[44px] transition-colors ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {activeTab === "presentation" && presentationContent ? (
        <div>{presentationContent}</div>
      ) : null}

      {activeTab === "document" ? (
        <div ref={contentRef}>{renderedContent}</div>
      ) : null}

      {activeTab === "raw" ? (
        <div className="relative group">
          <pre className="whitespace-pre-wrap break-words rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 dark:text-gray-100 p-4 font-mono text-sm">
            {content}
          </pre>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150">
            <CopyButton textContent={content} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
