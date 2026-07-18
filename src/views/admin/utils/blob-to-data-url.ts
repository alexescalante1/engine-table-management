/** Convierte una blob URL a data URL vía canvas resize. Solo browser. */
export async function blobUrlToDataUrl(
  blobUrl: string,
  maxSize = 300,
  format: "image/jpeg" | "image/png" = "image/jpeg",
): Promise<string | null> {
  try {
    const img = new window.Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = blobUrl;
    });
    const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
    const canvas = document.createElement("canvas");
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(format, format === "image/jpeg" ? 0.8 : undefined);
  } catch {
    return null;
  }
}
