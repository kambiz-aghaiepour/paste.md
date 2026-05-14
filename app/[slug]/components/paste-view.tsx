"use client";

import { useState } from "react";

interface PasteViewProps {
  content: string;
  renderedContent: React.ReactNode;
  expiresAt: number | null;
}

export function PasteView({ content, renderedContent }: PasteViewProps) {
  const [activeTab, setActiveTab] = useState<"rendered" | "raw">("rendered");

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
        renderedContent
      ) : (
        <pre className="whitespace-pre-wrap break-words rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 dark:text-gray-100 p-4 font-mono text-sm">
          {content}
        </pre>
      )}
    </div>
  );
}
