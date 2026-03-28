import { Readable } from "stream";

export const uploadToWorker = async (
  fileBuffer: Buffer | Readable,
  fileName: string,
  contentType: string
) => {
  // Convert Buffer to Blob for native FormData
  const blob = new Blob([fileBuffer as Buffer], { type: contentType });
  
  const formData = new FormData();
  formData.append("file", blob, fileName);

  const res = await fetch(
    "https://fancy-tree-f711tradiora-upload.billapan785.workers.dev",
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Worker upload failed: ${res.statusText} - ${errorText}`);
  }

  const data = await res.json();

  return data.url;
};
