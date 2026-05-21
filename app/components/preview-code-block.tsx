"use client";

import { useEffect, useState } from "react";
import type { HighlighterGeneric, BundledLanguage, BundledTheme } from "shiki";

let highlighterPromise: Promise<
  HighlighterGeneric<BundledLanguage, BundledTheme>
> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = import("shiki").then(({ createHighlighter }) =>
      createHighlighter({
        themes: ["github-light", "github-dark"],
        langs: [],
      }),
    );
  }
  return highlighterPromise;
}

interface PreviewCodeBlockProps {
  code: string;
  lang: string;
}

export function PreviewCodeBlock({ code, lang }: PreviewCodeBlockProps) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    let cancelled = false;

    getHighlighter().then(async (highlighter) => {
      if (cancelled) return;

      if (!highlighter.getLoadedLanguages().includes(lang as BundledLanguage)) {
        try {
          await highlighter.loadLanguage(lang as BundledLanguage);
        } catch {
          return;
        }
      }

      if (cancelled) return;

      const result = highlighter.codeToHtml(code, {
        lang,
        themes: { light: "github-light", dark: "github-dark" },
        defaultColor: "light",
      });
      setHtml(result);
    });

    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  if (html) {
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  }

  return (
    <pre>
      <code className={`language-${lang}`}>{code}</code>
    </pre>
  );
}
