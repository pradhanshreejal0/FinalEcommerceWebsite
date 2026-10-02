// Backend URL: set VITE_API_URL in client/.env, otherwise use the deployed API.
const API_BASE =
  import.meta.env.VITE_API_URL || "https://finalecommercewebsite-backend.onrender.com/api";

/**
 * Central fetch helper used by every page.
 *  - `body` can be a plain object (sent as JSON), a string, or FormData (file upload).
 *  - `accessToken` adds the "Authorization: Bearer ..." header.
 *  - Cookies are always included so the httpOnly refresh token works.
 * Returns the parsed JSON, or throws an Error with `.status` and `.data`
 * when the server answers with an error status.
 */
export async function api(path, { accessToken, headers = {}, body, ...rest } = {}) {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const finalHeaders = { ...headers };
  // For FormData the browser must set Content-Type itself (it adds the boundary).
  if (!isFormData) finalHeaders["Content-Type"] ||= "application/json";
  if (accessToken) finalHeaders.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    credentials: "include",
    headers: finalHeaders,
    body: body == null || isFormData || typeof body === "string" ? body : JSON.stringify(body),
  });

  // Read as text first so an empty response doesn't crash JSON parsing.
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const error = new Error(data?.message || response.statusText || "Request failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

/** Admin: upload an SVG icon for a parent category (max 500 KB). */
export async function uploadCategoryIcon(file, accessToken) {
  if (!file) throw new Error("Please select an SVG file");
  if (file.type !== "image/svg+xml") throw new Error("Only SVG files are allowed");
  if (file.size > 500 * 1024) throw new Error("SVG icon must be smaller than 500KB");

  const formData = new FormData();
  formData.append("icon", file);
  return api("/category-icons", { method: "POST", body: formData, accessToken });
}

export async function downloadReport(path, { accessToken } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    credentials: "include",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  if (!response.ok) {
    let message = response.statusText || "Failed to download report";
    try {
      const data = await response.json();
      message = data?.message || message;
    } catch {
      // The response may be a non-JSON server error.
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] || "sales-report.pdf";

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export { API_BASE };
