"use client";

import { useState, useEffect } from "react";

interface DraftIndicatorProps {
  visible: boolean;
  onDismiss: () => void;
}

export function DraftIndicator({ visible, onDismiss }: DraftIndicatorProps) {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    setShow(visible);
  }, [visible]);

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => {
      setShow(false);
      onDismiss();
    }, 3000);
    return () => clearTimeout(timer);
  }, [show, onDismiss]);

  if (!show) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-between rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 px-4 py-2 text-sm text-blue-700 dark:text-blue-300"
    >
      <span>Draft restored</span>
      <button
        onClick={() => {
          setShow(false);
          onDismiss();
        }}
        className="text-blue-400 dark:text-blue-500 hover:text-blue-600 dark:hover:text-blue-300"
        aria-label="Dismiss draft notification"
      >
        x
      </button>
    </div>
  );
}
