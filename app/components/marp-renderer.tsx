import { Marp } from "@marp-team/marp-core";
import { MarpViewer } from "./marp-viewer";

interface MarpRendererProps {
  content: string;
}

/**
 * Server Component that renders a paste as a Marp slide deck.
 *
 * Marp Core converts the markdown into inline-SVG slides plus the theme CSS
 * entirely on the server, so the client bundle only carries the small
 * interactive viewer / polyfill. The result is wrapped in a client `MarpViewer`
 * that handles slide navigation.
 *
 * Security: Marp Core applies its own default HTML allowlist (raw HTML is not
 * enabled), so user-authored markdown cannot inject `<script>` or unsafe tags.
 */
export function MarpRenderer({ content }: MarpRendererProps) {
  // `script: false` disables the inline polyfill script that Marp injects by
  // default (it would not run under React anyway); the client viewer invokes
  // the `@marp-team/marp-core/browser` helper instead.
  // `math: "katex"` keeps math typesetting consistent with the document renderer.
  const marp = new Marp({ script: false, math: "katex", minifyCSS: true });
  const { html, css } = marp.render(content);

  // Each slide is an `<svg data-marpit-svg …>` element. Count them on the server
  // so the viewer can render the correct slide counter without a hydration flash.
  const totalSlides = (html.match(/<svg[^>]*data-marpit-svg/g) ?? []).length;

  return (
    <div data-marp-presentation>
      {/* Marp theme CSS. Scoped to [data-marp-presentation] boxes via globals.css. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <MarpViewer html={html} total={totalSlides} />
    </div>
  );
}
