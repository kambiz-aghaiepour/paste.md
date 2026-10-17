import { headers } from "next/headers";
import { THEME_SCRIPT } from "@/lib/theme-script-content";

export async function ThemeScript() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}
