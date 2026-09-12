
/**
 * Upload an image file to the backend (which uploads to Cloudinary)
 * @param {File} file
 * @param {string} accessToken
 * @returns {Promise<string>} - Cloudinary secure URL
 */
export async function uploadImage(file, accessToken) {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(
    `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
      body: formData,
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Upload failed");
  }

  return data.url;
}
