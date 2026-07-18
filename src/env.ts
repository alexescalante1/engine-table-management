// src/env.ts
//
// Single Source of Truth para variables de entorno del proyecto.
// ÚNICA ubicación donde se accede a `process.env.*` en src/.
//
// Base sin proveedores: por ahora solo runtime flags agnósticos. A medida que se
// integren capabilities (base de datos, auth, storage, email), sus configs
// tipadas se decodifican aquí y se inyectan desde el composition root — nunca se
// accede a `process.env` directamente desde un adapter o service.
//
// Server-only vars no se exponen al cliente. No importar desde código "use client".

// ════════════════════════════════════════════════════════════
// SECTION 1: Runtime flags
// ════════════════════════════════════════════════════════════

export const NODE_ENV = process.env.NODE_ENV;
export const IS_DEV = NODE_ENV === "development";
export const IS_PROD = NODE_ENV === "production";
/** True en dev O test (cualquier cosa que no sea prod). Útil para loggers/debug. */
export const IS_NOT_PROD = NODE_ENV !== "production";
