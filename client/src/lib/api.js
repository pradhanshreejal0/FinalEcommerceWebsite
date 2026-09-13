const API_BASE = import.meta.env.VITE_API_URL || "https://finalecommercewebsite-backend.onrender.com/api";

export async function api(path, options = {}) {
  const { accessToken, headers: customHeaders, body, ...rest } = options;

  const headers = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  // Smart body handling
  let finalBody;
  if (body) {
    finalBody = typeof body === "string" ? body : JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers,
    body: finalBody,
    ...rest,
  });

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