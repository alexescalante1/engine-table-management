// Ratios de aspecto para AspectPicker/ImageCropper. Es dato de UI (proporciones
// de imagen), no lógica de negocio — por eso vive local al kit y no en @/domain.
export type GalleryAspect = "1:1" | "4:3" | "16:9" | "21:9" | "3:4" | "auto";

export const GALLERY_ASPECTS: { value: GalleryAspect; label: string; ratio: number }[] = [
  { value: "1:1", label: "Cuadrado", ratio: 1 },
  { value: "4:3", label: "Horizontal", ratio: 4 / 3 },
  { value: "16:9", label: "Ancho", ratio: 16 / 9 },
  { value: "21:9", label: "Panorámico", ratio: 21 / 9 },
  { value: "3:4", label: "Vertical", ratio: 3 / 4 },
  { value: "auto", label: "Natural", ratio: 0 },
];
