"use client";

import { useState, useTransition } from "react";
import { expirationFromExpiresAt } from "@/lib/expiration";
import { updatePasteExpirationAction } from "./actions";

interface ExpirationSelectProps {
  pasteId: string;
  createdAt: number;
  expiresAt: number | null;
}

export function ExpirationSelect({
  pasteId,
  createdAt,
  expiresAt,
}: ExpirationSelectProps) {
  const [expiration, setExpiration] = useState(() =>
    expirationFromExpiresAt(createdAt, expiresAt),
  );
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value === expiration) return;

    const previous = expiration;
    setExpiration(value);
    startTransition(async () => {
      const { success } = await updatePasteExpirationAction(pasteId, value);
      if (!success) {
        setExpiration(previous);
        alert("Failed to update expiration.");
      }
    });
  }

  return (
    <select
      value={expiration}
      onChange={handleChange}
      disabled={isPending}
      aria-label={`Expiration for paste ${pasteId}`}
      className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-1.5 py-1 text-xs text-gray-600 dark:text-gray-300 transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="1h">1 hour</option>
      <option value="1d">1 day</option>
      <option value="1w">1 week</option>
      <option value="1m">1 month</option>
      <option value="never">Never</option>
    </select>
  );
}
