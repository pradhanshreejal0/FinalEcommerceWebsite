const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://finalecommercewebsite-backend.onrender.com/api";

/**
 * Main API helper
 *
 * Used for normal JSON requests:
 * GET
 * POST
 * PUT
 * PATCH
 * DELETE
 */
export async function api(path, options = {}) {
  const {
    accessToken,
    headers: customHeaders,
    body,
    ...rest
  } = options;

  const headers = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  if (accessToken) {
    headers.Authorization =
      `Bearer ${accessToken}`;
  }

  /*
   * Convert normal JavaScript objects
   * into JSON.
   *
   * If body is already a string,
   * leave it alone.
   */
  let finalBody;

  if (body !== undefined && body !== null) {
    finalBody =
      typeof body === "string"
        ? body
        : JSON.stringify(body);
  }

  const res = await fetch(
    `${API_BASE}${path}`,
    {
      credentials: "include",
      headers,
      body: finalBody,
      ...rest,
    }
  );

  /*
   * Read response as text first.
   *
   * This prevents JSON parsing errors
   * when the server returns an empty response.
   */
  const text = await res.text();

  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        message: text,
      };
    }
  }

  if (!res.ok) {
    const message =
      data?.message ||
      res.statusText ||
      "Request failed";

    const error =
      new Error(message);

    error.status = res.status;
    error.data = data;

    throw error;
  }

  return data;
}

/**
 * Upload a parent-category SVG icon.
 *
 * IMPORTANT:
 * Do NOT set Content-Type manually.
 *
 * The browser automatically creates:
 *
 * multipart/form-data;
 * boundary=....
 */
export async function uploadCategoryIcon(
  file,
  accessToken
) {
  if (!file) {
    throw new Error(
      "Please select an SVG file"
    );
  }

  /*
   * Make sure the browser identifies
   * this as an SVG.
   */
  if (
    file.type !==
    "image/svg+xml"
  ) {
    throw new Error(
      "Only SVG files are allowed"
    );
  }

  /*
   * 500 KB maximum.
   */
  if (
    file.size >
    500 * 1024
  ) {
    throw new Error(
      "SVG icon must be smaller than 500KB"
    );
  }

  const formData =
    new FormData();

  formData.append(
    "icon",
    file
  );

  const headers = {};

  /*
   * Only Authorization is added.
   *
   * DO NOT add:
   *
   * Content-Type:
   * multipart/form-data
   *
   * The browser must set the boundary.
   */
  if (accessToken) {
    headers.Authorization =
      `Bearer ${accessToken}`;
  }

  const res = await fetch(
    `${API_BASE}/category-icons`,
    {
      method: "POST",

      credentials: "include",

      headers,

      body: formData,
    }
  );

  const text = await res.text();

  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        message: text,
      };
    }
  }

  if (!res.ok) {
    const message =
      data?.message ||
      res.statusText ||
      "SVG upload failed";

    const error =
      new Error(message);

    error.status = res.status;
    error.data = data;

    throw error;
  }

  return data;
}

/**
 * Export API base URL
 */
export { API_BASE };
