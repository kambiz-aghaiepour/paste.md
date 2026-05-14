import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="mb-4 text-4xl font-bold text-gray-400">404</h1>
      <p className="mb-8 text-gray-500">Paste not found</p>
      <Link href="/" className="text-blue-600 hover:underline">
        Back to home
      </Link>
    </main>
  );
}
