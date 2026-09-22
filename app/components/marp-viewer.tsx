"use client";

import { useCallback, useEffect, useRef, useState } from "react";
// `@marp-team/marp-core/browser` references browser globals (HTMLElement) at
// module-evaluation time, so it must be loaded lazily inside the effect below
// rather than statically imported (which would break server-side evaluation).
type MarpBrowserModule = typeof import("@marp-team/marp-core/browser");

interface MarpViewerProps {
  /** Server-rendered Marp slide markup (`<div class="marpit">…</div>`). */
  html: string;
  /** Number of slides, computed on the server to avoid a hydration flash. */
  total?: number;
}

/**
 * Interactive slide viewer for a Marp presentation.
 *
 * Receives the pre-rendered inline-SVG slides (served by `MarpRenderer`) and
 * manages navigation (buttons + keyboard), a slide counter, fullscreen, and the
 * Marp browser helper required for auto-scaling / SVG polyfills.
 */
export function MarpViewer({ html, total }: MarpViewerProps) {
  const deckRef = useRef<HTMLDivElement>(null);
  const slidesRef = useRef<SVGElement[]>([]);
  const marpUpdateRef = useRef<(() => void) | null>(null);
  const [index, setIndex] = useState(0);
  const [slideCount, setSlideCount] = useState(total ?? 0);

  const applyIndex = useCallback((i: number) => {
    const slides = slidesRef.current;
    for (let idx = 0; idx < slides.length; idx++) {
      slides[idx].style.display = idx === i ? "block" : "none";
    }
    // Re-run Marp auto-scaling so the now-visible slide fits correctly.
    marpUpdateRef.current?.();
  }, []);

  // Set up the Marp browser helper + capture the slide list once on mount.
  useEffect(() => {
    const container = deckRef.current;
    if (!container) return;

    // Slides are stable `<svg[data-marpit-svg]>` boundaries, so we can capture
    // and show them synchronously; the helper only upgrades elements inside.
    const slides = Array.from(
      container.querySelectorAll<SVGElement>("svg[data-marpit-svg]"),
    );
    slidesRef.current = slides;
    setSlideCount(slides.length);
    applyIndex(0);

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    import("@marp-team/marp-core/browser")
      .then((mod: MarpBrowserModule) => {
        if (cancelled) return;
        try {
          const marpBrowser = mod.default(container);
          marpBrowser.update?.();
          marpUpdateRef.current = marpBrowser.update
            ? () => marpBrowser.update()
            : null;
          cleanup = () => marpBrowser.cleanup?.();
          // Re-run auto-scaling for the visible slide now that elements are upgraded.
          marpUpdateRef.current?.();
        } catch {
          // If the polyfill/auto-scaling helper fails, the deck still renders
          // at base size; navigation continues to work.
          marpUpdateRef.current = null;
        }
      })
      .catch(() => {
        marpUpdateRef.current = null;
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [applyIndex]);

  // Keep the visible slide in sync whenever the index changes.
  useEffect(() => {
    applyIndex(index);
  }, [index, applyIndex]);

  const goTo = useCallback(
    (i: number) => {
      setIndex((prev) => Math.max(0, Math.min(slideCount - 1, i)));
    },
    [slideCount],
  );

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(
    () => setIndex((i) => Math.min(slideCount - 1, i + 1)),
    [slideCount],
  );

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          prev();
          break;
        case "Home":
          e.preventDefault();
          goTo(0);
          break;
        case "End":
          e.preventDefault();
          goTo(slideCount - 1);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, goTo, slideCount]);

  const toggleFullscreen = useCallback(() => {
    // Fullscreen the outer `[data-marp-presentation]` stage so the `:fullscreen`
    // CSS (full-height, no rounding) applies.
    const stage = deckRef.current?.closest("[data-marp-presentation]");
    if (!stage) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void stage.requestFullscreen();
    }
  }, []);

  return (
    <div className="relative h-full w-full">
      <div
        ref={deckRef}
        className="marp-deck h-full w-full"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex items-center justify-center">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-900/90">
          <button
            type="button"
            onClick={prev}
            disabled={index === 0}
            aria-label="Previous slide"
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            ‹
          </button>
          <span
            aria-live="polite"
            className="min-w-[3.5rem] text-center text-sm tabular-nums text-gray-600 dark:text-gray-300"
          >
            {slideCount === 0 ? "0 / 0" : `${index + 1} / ${slideCount}`}
          </span>
          <button
            type="button"
            onClick={next}
            disabled={slideCount === 0 || index === slideCount - 1}
            aria-label="Next slide"
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            ›
          </button>
          <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Toggle fullscreen"
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            ⛶
          </button>
        </div>
      </div>
    </div>
  );
}
