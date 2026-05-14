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
  const [expiration, setExpiration] = useState("never");
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
      <div className="flex rounded-lg border border-gray-200 overflow-hidden md:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("edit")}
          aria-pressed={activeTab === "edit"}
          className={`flex-1 py-2 text-sm font-medium text-center ${
            activeTab === "edit"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600"
          }`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          aria-pressed={activeTab === "preview"}
          className={`flex-1 py-2 text-sm font-medium text-center ${
            activeTab === "preview"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600"
          }`}
        >
          Preview
        </button>
      </div>

      {/* Split-pane container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Editor pane */}
        <div
          className={`md:block ${activeTab !== "edit" ? "hidden" : ""}`}
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your Markdown here..."
            aria-label="Markdown editor"
            className="min-h-[calc(100vh-280px)] w-full rounded-lg border border-gray-300 p-4 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Preview pane */}
        <div
          className={`md:block rounded-lg border border-gray-200 p-4 overflow-y-auto min-h-[calc(100vh-280px)] ${
            activeTab !== "preview" ? "hidden" : ""
          }`}
        >
          <div className="text-sm font-medium text-gray-500 mb-2">Preview</div>
          <MarkdownPreview content={debouncedPreview} />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={expiration}
          onChange={(e) => setExpiration(e.target.value)}
          aria-label="Paste expiration"
          className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        >
          <option value="never">Never expires</option>
          <option value="1h">1 hour</option>
          <option value="1d">1 day</option>
          <option value="1w">1 week</option>
          <option value="1m">1 month</option>
        </select>
        <button
          type="submit"
          disabled={submitting}
          className="ml-auto rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Paste"}
        </button>
      </div>
    </form>
  );
}
