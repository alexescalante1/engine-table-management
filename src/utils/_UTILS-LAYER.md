# Arquitectura del módulo de Utils

`utils/` es una **librería interna** de helpers agnósticos al negocio. No es una capa de Onion. Cualquier capa del proyecto puede consumirlo.

> **Norte rector**: librería de helpers agnósticos. **Objetivo meta**: agnosticismo absoluto al negocio + reutilización entre capas. Reglas mínimas porque la naturaleza del módulo es simple. La regla central (§1) es inviolable.

---

## 1. Regla central

**Cero conocimiento del negocio.** Si una utility menciona u opera sobre conceptos del dominio (business, plan, subscription, product, payment, etc.), no pertenece a utils — pertenece a la capa correspondiente.

Una buena utility se podría copiar a otro proyecto sin cambios.

---

## 2. Direcciones de dependencia

```
utils  →  Librerías agnósticas externas (react, lucide, jsqr, etc.)
utils  →  (cero capas de la app)

Capas de la app  →  utils (cualquiera puede consumirlo)
```

**Prohibido**: importar de `@/domain`, `@/application`, `@/infrastructure`, `@/views`.

---

## 3. Categorías

| Categoría | Naturaleza |
|---|---|
| Pure function | Determinística, sin side effects (formato, validación, generación de IDs, manipulación de objetos) |
| Side-effect helper | Toca browser APIs / DOM / Canvas para una operación específica (descarga, recorte, decodificación) |
| React hook transversal | Hook que expone estado de browser/runtime sin lógica del negocio |
| Catalog / constants | Mapeo o tabla técnica sin semántica del negocio |

---

## 4. Cohesión y estructura

- Carpeta plana: cada helper en su propio archivo.
- Sin barrel (`index.ts`) — imports explícitos preservan tree-shaking.
- Cada archivo hace una sola cosa cohesiva. Si crece y mezcla aspectos, splitear.
- Cero cross-imports entre archivos de utils salvo composición natural.

---

## 5. Naming

- Archivos: kebab-case (`format-date.ts`).
- Funciones: camelCase con verbo + objeto (`formatPrice`, `decodeQR`).
- Hooks de React: prefijo `use` (`useNetworkStatus`).
- Constants module-level: UPPER_SNAKE_CASE.
- Predicados booleanos: `isX`, `hasX`, `canX`.

---

## 6. Side effects

Permitidos cuando la operación los exige por naturaleza (descarga de archivo toca DOM, recorte toca canvas, hook de red toca window). El side effect debe reflejarse en el nombre del helper.

Prohibido: `console.log` u otro logger en código productivo.

---

## 7. Anti-patrones

- Importar de capas de la app.
- Mencionar conceptos del negocio en código, naming o comentarios.
- Mezclar lógica pura con side effects en una misma función.
- Estado mutable global no justificado por la semántica (excepción: counter para garantizar monotonicidad de IDs).
- Carpetas `helpers/`, `misc/`, `shared/`, `lib/` dentro de utils.
- Barrel `index.ts` que rompa tree-shaking.
- `any`, supresiones de tipo.

---

## 8. Checklist pre-merge

- [ ] Cero conocimiento del negocio (cero menciones a entities del dominio).
- [ ] Cero imports de capas de la app (`@/domain`, `@/application`, `@/infrastructure`, `@/views`).
- [ ] Categoría identificada (pure / side-effect / hook / catalog).
- [ ] Side effects justificados por la naturaleza de la operación.
- [ ] Naming: kebab-case archivo, camelCase función, prefijo `use` en hooks.
- [ ] Cero `console.log` en código productivo.
- [ ] Cero `any`, supresiones de tipo.
- [ ] El helper se podría copiar a otro proyecto sin cambios.
