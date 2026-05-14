import { THEME_SCRIPT } from "@/lib/theme-script-content";

/**
 * Server Component that renders a blocking inline script in <head>
 * to prevent Flash of Wrong Theme (FOWT).
 *
 * The script reads localStorage("paste-md-theme") and applies the
 * "dark" class to <html> before the browser paints. No async/defer
 * -- it must block to prevent the flash.
 */
export function ThemeScript() {
  return (
    <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
  );
}
