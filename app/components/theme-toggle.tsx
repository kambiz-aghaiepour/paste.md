"use client";

import { useState, useEffect } from "react";

type Theme = "system" | "light" | "dark";

/**
 * Client Component that cycles through system/light/dark theme
 * preferences. Persists choice to localStorage("paste-md-theme")
 * and toggles the "dark" class on <html> for Tailwind's class-based
 * dark mode.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = localStorage.getItem("paste-md-theme") as Theme | null;
    if (stored && (stored === "system" || stored === "light" || stored === "dark")) {
      setTheme(stored);
    }
  }, []);

  function applyTheme(newTheme: Theme) {
    setTheme(newTheme);
    localStorage.setItem("paste-md-theme", newTheme);
    const isDark =
      newTheme === "dark" ||
      (newTheme !== "light" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  }

  function cycle() {
    const next: Record<Theme, Theme> = {
      system: "light",
      light: "dark",
      dark: "system",
    };
    applyTheme(next[theme]);
  }

  return (
    <button
      onClick={cycle}
      aria-label={`Current theme: ${theme}`}
      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
    >
      {theme === "system" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      )}
      {theme === "light" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
      {theme === "dark" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
