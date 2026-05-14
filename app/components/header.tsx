import Link from "next/link";
import { ThemeToggle } from "@/app/components/theme-toggle";

/**
 * Server Component for the application header.
 * Renders branding link on the left and theme toggle on the right.
 * Appears on all pages via layout.tsx.
 */
export function Header() {
  return (
    <header className="mx-auto flex max-w-3xl items-center justify-between border-b border-gray-200 p-4 pb-4 sm:p-8 sm:pb-4 dark:border-gray-700">
      <Link href="/" className="text-lg font-bold">
        paste.md
      </Link>
      <ThemeToggle />
    </header>
  );
}
