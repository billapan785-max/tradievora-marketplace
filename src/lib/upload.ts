export const uploadFile = async (file: File, folder: string, userId: string): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  formData.append("userId", userId);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Upload failed");
  }

  const { url } = await response.json();
  return url;
};
