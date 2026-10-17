import Link from "next/link";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { getSessionFromCookies, isUsernameAuthorized } from "@/lib/session";

/**
 * Server Component for the application header.
 * Renders branding link on the left; on the right, the admin Login link
 * (or the Pastes/Logout links when an admin is logged in), then the theme toggle.
 * Appears on all pages via layout.tsx.
 */
export async function Header() {
  const session = await getSessionFromCookies();
  const isAdmin = session !== null && isUsernameAuthorized(session);

  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between border-b border-gray-200 p-4 pb-4 sm:p-8 sm:pb-4 dark:border-gray-700">
      <Link href="/" className="text-lg font-bold">
        paste.md
      </Link>
      <div className="flex items-center gap-2">
        {isAdmin ? (
          <>
            <Link
              href="/internal/pastes"
              className="flex items-center rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px]"
            >
              Pastes
            </Link>
            <Link
              href="/logout"
              className="flex items-center rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px]"
            >
              Logout
            </Link>
          </>
        ) : (
          <Link
            href="/login"
            className="flex items-center rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px]"
          >
            Login
          </Link>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
