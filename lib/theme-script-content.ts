/**
 * Inline script content for FOWT (Flash of Wrong Theme) prevention.
 *
 * This script runs synchronously in <head> before the first paint.
 * It reads the user's theme preference from localStorage and applies
 * the "dark" class to <html> before React hydrates.
 *
 * The content is shared between theme-script.tsx (rendering) and
 * next.config.ts (CSP SHA-256 hash computation).
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('paste-md-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})();`;
