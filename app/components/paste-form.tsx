"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PasteForm() {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

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
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create paste");
        return;
      }

      const data = await res.json();
      router.push(data.url);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste your Markdown here..."
        className="min-h-64 w-full rounded-lg border border-gray-300 p-4 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      />
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "Creating..." : "Create Paste"}
      </button>
    </form>
  );
}
