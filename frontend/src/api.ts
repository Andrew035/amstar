import { API_BASE } from "./config";

/** Thrown for any non-2xx response. `message` is safe to show the user. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Cleared session + reload. Called when the server says our token is no good. */
const forceLogout = () => {
  localStorage.removeItem("amstar_token");
  window.location.reload();
};

/**
 * Every authenticated API call goes through here. Attaches the token, turns an
 * expired sesssion into a logout instead of a silent no-op, and turns any other
 * failure into an ApiError carrying the backend's own message.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("amstar_token");

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection.");
  }

  // 401 means the token is expired or invalid - the session is over.
  // 403 means the token is fine but this account may not do this, which is
  // a message to show, not a reason to log someone out.
  if (response.status === 401) {
    forceLogout();
    throw new ApiError(401, "Your session expired. Please sign in again.");
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      // The backend's GlobalExceptionHandler always sends {"error": "..."}.
      if (body?.error) message = body.error;
    } catch {
      // Non-JSON error body; keep the generic message.
    }
    if (response.status === 403) {
      message = "You do not have permission to make that change.";
    }
    if (response.status === 429) {
      message = "Too many requests. Wait a moment and try again.";
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
