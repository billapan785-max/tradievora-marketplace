import imageCompression from "browser-image-compression";

export const uploadFile = async (file: File, folder: string, userId: string): Promise<string> => {
  let fileToUpload: File | Blob = file;

  // Only compress images
  if (file.type.startsWith("image/")) {
    try {
      const options = {
        maxSizeMB: 1, // Max size 1MB
        maxWidthOrHeight: 1920, // Max dimension 1920px
        useWebWorker: true,
      };
      fileToUpload = await imageCompression(file, options);
    } catch (error) {
      console.error("Image compression failed, uploading original file:", error);
      fileToUpload = file;
    }
  }

  const formData = new FormData();
  formData.append("file", fileToUpload, file.name);
  formData.append("folder", folder);
  formData.append("userId", userId);

  const response = await fetch("/api/upload/", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Upload Error (${response.status}): ${errorText}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      const data = await response.json();
      return data.url;
    } catch (e) {
      throw new Error("Server returned invalid JSON");
    }
  } else {
    const text = await response.text();
    throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
  }
};
