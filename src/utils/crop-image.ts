interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Recorta una imagen según coordenadas pixel y devuelve un File WebP.
 * Usa OffscreenCanvas (mismo patrón que image-processor.ts).
 * - `lossless`=true → WebP quality 1.0 (preserva transparencia sin pérdida).
 * - `outDim` (opcional): el output se escala a EXACTAMENTE ese tamaño en la
 *   misma pasada de canvas (crop + resize = 1 encode). El llamador garantiza
 *   que el recorte ya tiene el aspecto de `outDim` (el cropper fija `aspect`),
 *   así que es escalado sin distorsión. Fija la resolución (p.ej. fondos:
 *   landscape 1920×1080, portrait 1080×1920) y acota el peso (< 5MB). Sin `outDim`
 *   el comportamiento es idéntico al anterior (aditivo: los demás consumidores
 *   no lo pasan).
 */
export async function getCroppedFile(
  imageSrc: string,
  pixelCrop: PixelCrop,
  fileName: string,
  lossless?: boolean,
  outDim?: { width: number; height: number },
): Promise<File> {
  const image = await loadImage(imageSrc);
  const dw = outDim ? outDim.width : pixelCrop.width;
  const dh = outDim ? outDim.height : pixelCrop.height;
  const canvas = new OffscreenCanvas(dw, dh);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, dw, dh,
  );
  const quality = lossless ? 1.0 : 0.98;
  const blob = await canvas.convertToBlob({ type: "image/webp", quality });
  return new File([blob], fileName.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
