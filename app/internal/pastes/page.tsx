import { redirect } from "next/navigation";
import { getAllPastes } from "@/lib/db/queries";
import { DeletePasteButton } from "./delete-paste-button";
import { ExpirationSelect } from "./expiration-select";
import { RenamePaste } from "./rename-paste";
import { getSessionFromCookies, isUsernameAuthorized } from "@/lib/session";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatDate(unix: number): string {
  return new Date(unix * 1000).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export default async function InternalPastesPage() {
  const session = await getSessionFromCookies();
  if (!session || !isUsernameAuthorized(session)) {
    redirect("/login");
  }

  const pastes = getAllPastes();

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-8">
      <h1 className="text-xl font-semibold mb-1">All Pastes</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {pastes.length} paste{pastes.length !== 1 ? "s" : ""}
      </p>

      {pastes.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No pastes found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="py-3 pr-4">ID</th>
                <th className="py-3 pr-4">Created</th>
                <th className="py-3 pr-4">Expires</th>
                <th className="py-3 pr-4 text-right">Size</th>
                <th className="py-3 pr-4">Rename</th>
                <th className="py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {pastes.map((paste) => (
                <tr key={paste.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-2.5 pr-4">
                    <a
                      href={`/${paste.id}`}
                      className="font-mono text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {paste.id}
                    </a>
                  </td>
                  <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {formatDate(paste.createdAt)}
                  </td>
                  <td className="py-2.5 pr-4">
                    <ExpirationSelect
                      pasteId={paste.id}
                      createdAt={paste.createdAt}
                      expiresAt={paste.expiresAt}
                    />
                  </td>
                  <td className="py-2.5 pr-4 text-right text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {formatSize(paste.sizeBytes)}
                  </td>
                  <td className="py-2.5 pr-4">
                    <RenamePaste pasteId={paste.id} />
                  </td>
                  <td className="py-2.5 text-center">
                    <DeletePasteButton pasteId={paste.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
