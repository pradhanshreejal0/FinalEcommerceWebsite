const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * Simple fetch wrapper that:
 * - Prefixes the API base URL
 * - Always sends credentials (for httpOnly refresh cookie)
 * - Attaches Authorization header when accessToken is provided
 * - Throws an error with the server message on non-2xx responses
 */
export async function api(path, options = {}) {
  const { accessToken, headers: customHeaders, ...rest } = options;

  const headers = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers,
    ...rest,
  });

  // Handle empty responses (e.g. 204)
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message || res.statusText || "Request failed";
    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export { API_BASE };
