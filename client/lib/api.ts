/**
 * API base URL for fetch calls and image paths.
 * - Dev: empty (same origin, Vite proxies /api to Express)
 * - Netlify (same deploy): empty (redirects /api/* to function)
 * - Netlify + external backend: set VITE_API_URL in Netlify env (e.g. https://your-api.onrender.com)
 */
export const API_BASE =
  typeof import.meta.env?.VITE_API_URL === "string" && import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/$/, "")
    : "";

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

/** Resolve image path - prepend API_BASE when using external backend (e.g. /uploads/xyz → https://api.../uploads/xyz) */
export function imageUrl(path: string | null | undefined): string {
  if (!path || typeof path !== "string") return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return apiUrl(path.startsWith("/") ? path : `/${path}`);
}
