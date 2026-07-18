// Composition root de la capa de aplicación.
//
// Único punto autorizado a importar de `@/infrastructure` (ver §3 de
// _APPLICATION-LAYER.md). Aquí se importan los singletons de infraestructura y
// se inyectan en las factory functions de cada feature, exportando los servicios
// ya cableados.
//
// Vacío por ahora: no hay features ni infraestructura conectada (base sin lógica
// de negocio). Cada bounded context se ensamblará aquí a medida que se cree.

export {};
