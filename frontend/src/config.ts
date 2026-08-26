// Empty string in production: the API is same-origin behind the reverse proxy,
// so requests go to /api/... relative and CORS never applies.
export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
