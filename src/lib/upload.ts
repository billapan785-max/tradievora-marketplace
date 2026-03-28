export const uploadFile = async (file: File, folder: string, userId: string): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    "https://fancy-tree-f711tradiora-upload.billapan785.workers.dev",
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Worker Error (${response.status}): ${errorText}`);
  }

  try {
    const data = await response.json();
    return data.url || data.image_url;
  } catch (e) {
    throw new Error("Worker returned invalid JSON");
  }
};
