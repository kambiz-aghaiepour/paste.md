"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useLocalStorageDraft } from "@/lib/hooks/use-local-storage-draft";
import { MarkdownPreview } from "@/app/components/markdown-preview";
import { DraftIndicator } from "@/app/components/draft-indicator";

export function PasteForm() {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [layout, setLayout] = useState<"split" | "preview">("split");
  const [expiration, setExpiration] = useState("1d");
  const router = useRouter();

  const debouncedPreview = useDebounce(content, 300);
  const debouncedSave = useDebounce(content, 1000);
  const { restoredDraft, wasRestored, saveDraft, clearDraft, dismissRestored } =
    useLocalStorageDraft();

  // Draft restore effect
  useEffect(() => {
    if (restoredDraft !== null) {
      setContent(restoredDraft);
    }
  }, [restoredDraft]);

  // Draft save effect
  useEffect(() => {
    if (debouncedSave) {
      saveDraft(debouncedSave);
    }
  }, [debouncedSave, saveDraft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!content.trim()) {
      setError("Content cannot be empty");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, expiration }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create paste");
        return;
      }

      const data = await res.json();
      router.push(data.url);
      clearDraft();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DraftIndicator visible={wasRestored} onDismiss={dismissRestored} />

      {/* Mobile toggle */}
      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden md:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("edit")}
          aria-pressed={activeTab === "edit"}
          className={`flex-1 py-2 text-sm font-medium text-center min-h-[44px] transition-colors ${
            activeTab === "edit"
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          }`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          aria-pressed={activeTab === "preview"}
          className={`flex-1 py-2 text-sm font-medium text-center min-h-[44px] transition-colors ${
            activeTab === "preview"
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          }`}
        >
          Preview
        </button>
      </div>

      {/* Desktop layout toggle */}
      <div className="hidden md:flex justify-end">
        <button
          type="button"
          onClick={() => setLayout(layout === "split" ? "preview" : "split")}
          aria-label={layout === "split" ? "Show preview only" : "Show side by side"}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {layout === "split" ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
              Preview only
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="12" y1="3" x2="12" y2="21" />
              </svg>
              Side by side
            </>
          )}
        </button>
      </div>

      {/* Split-pane container */}
      <div className={`grid grid-cols-1 gap-4 items-stretch ${layout === "split" ? "md:grid-cols-2" : ""}`}>
        {/* Editor pane */}
        <div
          className={`${layout === "split" ? "md:flex md:flex-col" : "hidden"} ${activeTab !== "edit" ? "hidden" : ""}`}
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your Markdown here..."
            aria-label="Markdown editor"
            className="min-h-[calc(100vh-280px)] md:flex-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 p-4 font-mono text-sm transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
          />
        </div>

        {/* Preview pane */}
        <div
          className={`md:block rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 p-4 overflow-y-auto min-h-[calc(100vh-280px)] ${
            activeTab !== "preview" ? "hidden" : ""
          }`}
        >
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Preview</div>
          <MarkdownPreview content={debouncedPreview} />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={expiration}
          onChange={(e) => setExpiration(e.target.value)}
          disabled={submitting}
          aria-label="Paste expiration"
          className="w-full sm:w-auto rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="1h">1 hour</option>
          <option value="1d">1 day</option>
          <option value="1w">1 week</option>
          <option value="1m">1 month</option>
        </select>
        <button
          type="submit"
          disabled={submitting}
          className="ml-auto flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {submitting && (
            <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {submitting ? "Creating..." : "Create Paste"}
        </button>
      </div>
    </form>
  );
}
