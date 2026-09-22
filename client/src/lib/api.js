const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://finalecommercewebsite-backend.onrender.com/api";

/**
 * Main API helper.
 *
 * Supports:
 * GET
 * POST
 * PUT
 * PATCH
 * DELETE
 *
 * Supports both:
 * JSON
 * FormData
 */
export async function api(path, options = {}) {
  const {
    accessToken,
    headers: customHeaders = {},
    body,
    ...rest
  } = options;

  const headers = {
    ...customHeaders,
  };

  /*
   * Never manually set Content-Type when using FormData.
   *
   * The browser must generate:
   *
   * multipart/form-data; boundary=...
   */
  const isFormData =
    typeof FormData !== "undefined" &&
    body instanceof FormData;

  if (!isFormData) {
    headers["Content-Type"] =
      headers["Content-Type"] ||
      "application/json";
  }

  if (accessToken) {
    headers.Authorization =
      `Bearer ${accessToken}`;
  }

  let finalBody = body;

  /*
   * Convert JavaScript objects to JSON.
   *
   * Leave these untouched:
   *
   * - FormData
   * - strings
   * - null
   * - undefined
   */
  if (
    body !== undefined &&
    body !== null &&
    !isFormData &&
    typeof body !== "string"
  ) {
    finalBody = JSON.stringify(body);
  }

  const response = await fetch(
    `${API_BASE}${path}`,
    {
      ...rest,
      credentials: "include",
      headers,
      body: finalBody,
    }
  );

  /*
   * Read as text first.
   *
   * This prevents:
   *
   * Unexpected end of JSON input
   *
   * when the backend returns an empty response.
   */
  const text =
    await response.text();

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

  if (!response.ok) {
    const error = new Error(
      data?.message ||
        response.statusText ||
        "Request failed"
    );

    error.status =
      response.status;

    error.data = data;

    throw error;
  }

  return data;
}

/**
 * Upload parent-category SVG icon.
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

  if (accessToken) {
    headers.Authorization =
      `Bearer ${accessToken}`;
  }

  const response =
    await fetch(
      `${API_BASE}/category-icons`,
      {
        method: "POST",
        credentials: "include",
        headers,
        body: formData,
      }
    );

  const text =
    await response.text();

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

  if (!response.ok) {
    const error = new Error(
      data?.message ||
        response.statusText ||
        "SVG upload failed"
    );

    error.status =
      response.status;

    error.data = data;

    throw error;
  }

  return data;
}

export { API_BASE };
