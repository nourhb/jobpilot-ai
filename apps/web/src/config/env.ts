/**
 * Only VITE_-prefixed variables are ever exposed to the browser bundle
 * (Vite's own safety mechanism). Never read `import.meta.env` anywhere
 * else in the app -- go through this module so there is exactly one
 * place that defines what is public (see docs/security.md, section 56).
 */
export const env = {
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000",
};
