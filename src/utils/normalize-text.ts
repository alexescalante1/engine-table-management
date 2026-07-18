/** Normaliza string para búsqueda insensible a mayúsculas y tildes ("pizzeria" matches "Pizzería"). */
export const normalizeForSearch = (s: string): string =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
