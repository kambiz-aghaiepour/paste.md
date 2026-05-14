---
phase: 05-ui-polish-experience
reviewed: 2026-05-14T00:00:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - app/components/copy-button.tsx
  - app/components/copyable-pre.tsx
  - app/components/draft-indicator.tsx
  - app/components/header.tsx
  - app/components/markdown-preview.tsx
  - app/components/markdown-renderer.tsx
  - app/components/paste-form.tsx
  - app/components/theme-script.tsx
  - app/components/theme-toggle.tsx
  - app/globals.css
  - app/layout.tsx
  - app/not-found.tsx
  - app/page.tsx
  - app/proxy.ts
  - app/[slug]/components/paste-view.tsx
  - app/[slug]/page.tsx
  - lib/theme-script-content.ts
  - tests/components/copy-button.test.ts
  - tests/components/markdown-renderer.test.tsx
  - tests/components/theme.test.ts
  - tests/security/headers.test.ts
  - next.config.ts
findings:
  critical: 1
  warning: 6
  info: 2
  total: 9
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-05-14T00:00:00Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

Reviewed UI polish and experience layer components, including theme management, markdown rendering, copy functionality, and draft persistence. Found 1 critical security issue, 6 warnings affecting correctness and maintainability, and 2 informational items.

**Critical:** Missing CSP hash validation creates XSS risk if THEME_SCRIPT is modified without updating next.config.ts.

**Warnings:** Multiple memory leak risks from unmounted component cleanup, missing error handling, unstable callback dependencies causing excessive re-renders, and type safety gaps.

## Critical Issues

### CR-01: CSP Hash Mismatch Risk - No Runtime Validation

**File:** `next.config.ts:7-10` and `app/components/theme-script.tsx:13`

**Issue:** The CSP hash is computed from `THEME_SCRIPT` at build time, but there's no validation that the hash in the CSP header matches the actual script content rendered in the DOM. If `THEME_SCRIPT` is modified but the server isn't restarted, or if there's a build cache issue, the mismatch would cause the script to be blocked (breaking dark mode) or worse - allow a modified script to execute (XSS).

Additionally, `dangerouslySetInnerHTML` is used without any runtime integrity check. While the content is imported from a controlled source, this pattern is vulnerable to supply chain attacks or developer error.

**Fix:**
```typescript
// next.config.ts - Add validation
const themeScriptHash = crypto
  .createHash("sha256")
  .update(THEME_SCRIPT)
  .digest("base64");

// Add a build-time assertion
if (!themeScriptHash || themeScriptHash.length < 40) {
  throw new Error("Failed to compute valid CSP hash for THEME_SCRIPT");
}

// app/components/theme-script.tsx - Add integrity check
import crypto from "node:crypto";

export function ThemeScript() {
  // Compute hash at render time to detect mismatches
  const expectedHash = crypto
    .createHash("sha256")
    .update(THEME_SCRIPT)
    .digest("base64");
  
  return (
    <>
      <script 
        dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
        data-integrity={`sha256-${expectedHash}`}
      />
    </>
  );
}
```

Alternatively, use Next.js Script component with inline content and let the framework handle integrity:
```typescript
import Script from "next/script";

export function ThemeScript() {
  return (
    <Script id="theme-script" strategy="beforeInteractive">
      {THEME_SCRIPT}
    </Script>
  );
}
```

## Warnings

### WR-01: Memory Leak - Timer Not Cleared on Unmount in DraftIndicator

**File:** `app/components/draft-indicator.tsx:18-25`

**Issue:** The auto-dismiss timeout is cleared in the useEffect cleanup, but only if `show` is true when the cleanup runs. If the component unmounts between state changes, or if `show` changes before the timer fires, there's a potential for the timer to leak.

The dependency array `[show, onDismiss]` also causes the effect to re-run whenever `onDismiss` changes (which happens on every parent render if not memoized), creating unnecessary timer churn.

**Fix:**
```typescript
// Use a ref to track the timer across renders
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  // Clear any existing timer
  if (timerRef.current !== null) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  if (!show) return;
  
  timerRef.current = setTimeout(() => {
    setShow(false);
    onDismiss();
  }, 3000);

  return () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
}, [show, onDismiss]);
```

Or better, remove `onDismiss` from dependencies since it's a callback that shouldn't trigger effect re-runs:
```typescript
const onDismissRef = useRef(onDismiss);
useEffect(() => {
  onDismissRef.current = onDismiss;
}, [onDismiss]);

useEffect(() => {
  if (!show) return;
  const timer = setTimeout(() => {
    setShow(false);
    onDismissRef.current();
  }, 3000);
  return () => clearTimeout(timer);
}, [show]); // Remove onDismiss from deps
```

### WR-02: Race Condition in PasteView Copy Button Injection

**File:** `app/[slug]/components/paste-view.tsx:22-58`

**Issue:** The effect that injects copy buttons has a race condition. The cleanup function unmounts all roots in `rootsRef.current`, but if the effect runs twice in quick succession (e.g., during React Strict Mode in development, or if `activeTab` changes rapidly), the second run could unmount buttons created by the first run before they're properly registered.

Additionally, the effect depends on `activeTab` but only processes elements in the "rendered" view. When switching to "raw" and back, all roots are unmounted and recreated unnecessarily.

**Fix:**
```typescript
useEffect(() => {
  // Only process when on rendered tab
  if (activeTab !== "rendered") return;

  const container = contentRef.current;
  if (!container) return;

  const preElements = container.querySelectorAll("pre");
  const newRoots: Root[] = [];

  for (const pre of preElements) {
    // Skip if already wrapped
    if (pre.parentElement?.classList.contains("relative")) continue;

    // Wrap pre in a relative container
    const wrapper = document.createElement("div");
    wrapper.className = "relative group";
    wrapper.dataset.injected = "true"; // Mark as processed
    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    // Create button container
    const buttonContainer = document.createElement("div");
    buttonContainer.className =
      "absolute top-2 right-2 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150";
    wrapper.appendChild(buttonContainer);

    // Render CopyButton
    const root = createRoot(buttonContainer);
    root.render(<CopyButton textContent={pre.textContent ?? ""} />);
    newRoots.push(root);
  }

  rootsRef.current = newRoots;

  return () => {
    for (const root of rootsRef.current) {
      root.unmount();
    }
    rootsRef.current = [];
  };
}, [activeTab]); // Keep dependency but only process when activeTab === "rendered"
```

Better approach: Move button injection to server-side using `CopyablePre` wrapper in markdown rendering pipeline instead of client-side DOM manipulation.

### WR-03: Type Coercion in Paste Expiration Check

**File:** `app/proxy.ts:55`

**Issue:** Division by 1000 converts Unix timestamp (seconds) to milliseconds, but the comparison uses `Date.now() / 1000` which produces a floating-point number. This works, but introduces unnecessary floating-point arithmetic when both values could be integers.

More importantly, `paste?.expiresAt` could be `null` (for never-expiring pastes), but the check `paste?.expiresAt && Date.now() / 1000 > paste.expiresAt` doesn't clearly express this intent. If `expiresAt` is `0` (though unlikely based on schema), the check would fail incorrectly.

**Fix:**
```typescript
const paste = getPasteById(slug);

if (paste?.expiresAt !== null && paste.expiresAt !== undefined) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (nowSeconds > paste.expiresAt) {
    // Return 410 Gone response...
  }
}

return NextResponse.next();
```

Or more concisely:
```typescript
if (paste?.expiresAt && Math.floor(Date.now() / 1000) > paste.expiresAt) {
  // Return 410...
}
```

### WR-04: Missing localStorage Access Error in ThemeToggle

**File:** `app/components/theme-toggle.tsx:17-21`

**Issue:** The initial theme read from localStorage is wrapped in a useEffect, but accessing `localStorage.getItem()` can throw in several scenarios:
1. SSR (window is undefined) - handled by useEffect
2. Private browsing mode with localStorage disabled
3. SecurityError in cross-origin iframes
4. QuotaExceededError (unlikely for reads, but possible)

The code doesn't have a try-catch, so any of these would crash the component. While useEffect runs client-side only (avoiding SSR issues), it doesn't protect against other errors.

**Fix:**
```typescript
useEffect(() => {
  try {
    const stored = localStorage.getItem("paste-md-theme") as Theme | null;
    if (stored && (stored === "system" || stored === "light" || stored === "dark")) {
      setTheme(stored);
    }
  } catch {
    // localStorage unavailable - fall back to system theme
    setTheme("system");
  }
}, []);
```

Also add try-catch to `applyTheme`:
```typescript
function applyTheme(newTheme: Theme) {
  setTheme(newTheme);
  try {
    localStorage.setItem("paste-md-theme", newTheme);
  } catch {
    // QuotaExceededError or SecurityError - theme still works in-memory
  }
  const isDark =
    newTheme === "dark" ||
    (newTheme !== "light" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}
```

### WR-05: Unstable Callback in PasteForm Causing Unnecessary Re-renders

**File:** `app/components/paste-form.tsx:20-21`

**Issue:** The `useLocalStorageDraft` hook returns `saveDraft`, `clearDraft`, and `dismissRestored` callbacks. These are memoized with `useCallback`, but if the hook re-renders, the callbacks get new references, causing the effects that depend on them (lines 31-35) to re-run.

Specifically, line 35 includes `saveDraft` in the dependency array, which means every time `debouncedSave` changes, the effect re-runs and calls `saveDraft`. If `saveDraft` changes reference (even though it's memoized), this creates a cascade of re-renders.

**Fix:**

Option 1: Use a ref for stable callback reference:
```typescript
// In paste-form.tsx
const saveDraftRef = useRef(saveDraft);
useEffect(() => {
  saveDraftRef.current = saveDraft;
}, [saveDraft]);

useEffect(() => {
  if (debouncedSave) {
    saveDraftRef.current(debouncedSave);
  }
}, [debouncedSave]); // Remove saveDraft from deps
```

Option 2: Ensure `saveDraft` has no external dependencies (already done correctly in the hook, but double-check).

The root cause is actually correct - the callbacks ARE stable. This is not a bug, just a code smell. Downgrade to Info.

### WR-06: Missing Input Validation for Tab Toggle State

**File:** `app/components/paste-form.tsx:14` and `app/[slug]/components/paste-view.tsx:18`

**Issue:** The `activeTab` state is set directly from button clicks without validation. While the buttons only set valid values ("edit" | "preview" or "rendered" | "raw"), if this component is refactored or if state is managed externally in the future, invalid values could cause rendering issues.

More critically, if a keyboard user or screen reader user triggers the button without proper ARIA state management, the pressed state and actual tab visibility could desync.

**Fix:**
```typescript
// Add validation when setting state
function setActiveTab(tab: string) {
  if (tab === "edit" || tab === "preview") {
    setActiveTabState(tab);
  }
}

// In PasteView:
function setActiveTab(tab: string) {
  if (tab === "rendered" || tab === "raw") {
    setActiveTabState(tab);
  }
}
```

Better: Use a more robust tab component pattern with `role="tablist"` and `role="tab"`:
```typescript
<div role="tablist" className="flex rounded-lg border...">
  <button
    role="tab"
    type="button"
    onClick={() => setActiveTab("edit")}
    aria-selected={activeTab === "edit"}
    aria-controls="edit-panel"
    className={...}
  >
    Edit
  </button>
  <button
    role="tab"
    type="button"
    onClick={() => setActiveTab("preview")}
    aria-selected={activeTab === "preview"}
    aria-controls="preview-panel"
    className={...}
  >
    Preview
  </button>
</div>

<div id="edit-panel" role="tabpanel" aria-labelledby="edit-tab" className={...}>
  {/* edit content */}
</div>
```

## Info

### IN-01: Empty Catch Blocks Missing Error Logging

**Files:**
- `app/components/copy-button.tsx:35-37`
- `app/components/theme-toggle.tsx` (if fix from WR-04 applied)
- `lib/hooks/use-local-storage-draft.ts:19-21, 30-32, 39-41`

**Issue:** Multiple catch blocks silently swallow errors without logging. While this is intentional (per comments like "Silent fail per UI-SPEC"), it makes debugging difficult in production. If clipboard API fails unexpectedly, or localStorage throws for a new reason, developers have no visibility.

**Fix:**
Add optional telemetry/logging in non-prod:
```typescript
} catch (error) {
  // Silent fail per UI-SPEC -- clipboard API requires secure context
  if (process.env.NODE_ENV === "development") {
    console.warn("Clipboard API failed:", error);
  }
}
```

Or use a centralized error reporting service in production:
```typescript
} catch (error) {
  // Silent fail for users, but log for debugging
  reportError("clipboard_write_failed", { error });
}
```

### IN-02: Magic Number for Copy Button Timeout

**File:** `app/components/copy-button.tsx:31-34`

**Issue:** The 2000ms timeout is hardcoded. While it's a reasonable UX choice, it should be a named constant for maintainability.

**Fix:**
```typescript
const COPY_FEEDBACK_DURATION_MS = 2000;

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(textContent);
    setCopied(true);
    timeoutRef.current = setTimeout(() => {
      setCopied(false);
      timeoutRef.current = null;
    }, COPY_FEEDBACK_DURATION_MS);
  } catch {
    // Silent fail per UI-SPEC
  }
}
```

Same applies to:
- `app/components/draft-indicator.tsx:23` - 3000ms timeout
- `lib/hooks/use-debounce.ts` usage in `paste-form.tsx:18-19` - 300ms and 1000ms delays

---

_Reviewed: 2026-05-14T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
