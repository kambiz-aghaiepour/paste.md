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
      <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("rendered")}
          aria-pressed={activeTab === "rendered"}
          className={`flex-1 py-2 text-sm font-medium text-center ${
            activeTab === "rendered"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600"
          }`}
        >
          Rendered
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("raw")}
          aria-pressed={activeTab === "raw"}
          className={`flex-1 py-2 text-sm font-medium text-center ${
            activeTab === "raw"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600"
          }`}
        >
          Raw
        </button>
      </div>

      {activeTab === "rendered" ? (
        renderedContent
      ) : (
        <pre className="whitespace-pre-wrap break-words rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm">
          {content}
        </pre>
      )}
    </div>
  );
}
