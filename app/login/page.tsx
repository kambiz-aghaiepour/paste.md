import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies, isUsernameAuthorized } from "@/lib/session";
import { loginAction } from "./actions";

export const metadata = {
  title: "Login - paste.md",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const session = await getSessionFromCookies();

  if (session && isUsernameAuthorized(session)) {
    redirect(next && next.startsWith("/") ? next : "/internal/pastes");
  }

  return (
    <main className="mx-auto max-w-md p-4 sm:p-8">
      <h1 className="text-xl font-semibold mb-4">Admin Login</h1>
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-3 py-2 text-sm text-red-600 dark:text-red-400"
        >
          Invalid username or password.
        </p>
      )}
      <form action={loginAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Username
          <input
            type="text"
            name="username"
            autoComplete="username"
            required
            className="rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            className="rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </label>
        {next && (
          <input type="hidden" name="next" value={next} />
        )}
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Log in
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/" className="hover:underline">
          Back to paste.md
        </Link>
      </p>
    </main>
  );
}
