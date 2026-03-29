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
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Upload Error (${response.status}): ${errorText}`);
  }

  try {
    const data = await response.json();
    return data.url;
  } catch (e) {
    throw new Error("Server returned invalid JSON");
  }
};
