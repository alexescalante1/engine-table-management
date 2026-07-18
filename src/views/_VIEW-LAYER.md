# Arquitectura de la capa de Vistas

Reglas normativas para `views/`. Romper una regla solo si se justifica por una excepción documentada (§21). Las reglas inviolables están listadas en §21.5.

> **Norte rector**: orquestar UI sobre servicios de aplicación. Cada elemento evoluciona sin obligar cambios en elementos no relacionados. Duplicación deliberada > acoplamiento accidental.
>
> **Objetivos meta**: separación estricta UI/Datos. Cohesión por feature, soberanía entre vistas hermanas (duplicación tolerada). SOLID y DDD aplicados sobre el lenguaje del producto. Cero lógica de negocio.

---

## 1. Responsabilidades

**SÍ:**
- Renderizado y composición visual.
- Orquestación de hooks y providers.
- Manejo de eventos.
- Estado local de UI (formularios, modales, drawers, navegación).
- Estados de UI (loading, empty, ready, error, syncing).
- Animaciones y transiciones.
- Optimistic updates.
- Consumo de cache.

**NO:**
- Lógica de negocio.
- Acceso directo a I/O.
- Transformaciones que dependan de reglas del dominio.
- Implementación de cache.
- Mapeos entre tipos de infraestructura y dominio.

Cuando se necesita una operación NO permitida: delegar a dominio, aplicación o infraestructura.

---

## 2. Separación UI / Datos

| Responsabilidad | Vive en |
|---|---|
| Renderizado y eventos | Componente JSX |
| Estado, side effects, suscripciones, lifecycle | Hook |
| Estado de formulario | Hook dedicado (§13.3) |
| Reglas de validación | Validator puro (§13.4) |
| Cálculos derivados de negocio | Función pura del dominio |
| Persistencia y comunicación externa | Servicio de aplicación |
| Cache | Adaptador de infraestructura, consumido vía hook |

### 2.1. Flujo obligatorio

```
Componente (JSX) → Hook → Servicio/Provider → Adaptador → Origen externo
```

### 2.2. Reglas

- Lógica del componente que requiere más de un vistazo: extraer a hook.
- Hook nunca retorna JSX.
- Componente nunca llama directamente a APIs del navegador, red o almacenamiento.
- Cálculos de negocio: importar del dominio, no reimplementar.
- Hook con más de una responsabilidad: descomponer.
- Form state: hook dedicado.
- Validación: módulo puro.

---

## 3. Direcciones de dependencia

```
Vistas       →  Aplicación, Dominio, Utilidades, Contratos, Ambiente
Aplicación   →  Dominio, Infraestructura (vía puertos)
Infraestructura → Dominio (entidades, puertos)
Dominio      →  (nada externo)
```

> Puerto = interfaz declarada en el dominio que la infraestructura implementa.

**Prohibido:**
- Vistas → Infraestructura directa.
- Vistas hermanas entre sí.
- Capas inferiores → superiores.

### 3.1. Conexión vista → servicios

- Invocar métodos de servicios. No instanciar.
- Servicios inyectados desde un punto único de composición.
- Recibir tipos del dominio. No tipos de infraestructura.
- Entregar parámetros tipados. No objetos crudos del navegador.

---

## 4. Estados de UI

Toda interacción asíncrona o de mutación distingue: `loading | empty | ready | error | syncing`.

Representar con discriminated unions tipadas. No flags booleanos sueltos.

### 4.1. Feedback visual

- Loading > 200ms: indicador (skeleton, spinner, placeholder).
- Loading < 200ms: sin indicador.
- Error: toast o panel inline accionable.
- Empty: mensaje + acción primaria.
- Success no obvio: confirmación breve no bloqueante.

---

## 5. Optimistic updates

Mutaciones de edición de contenido del usuario son optimistic.

### 5.1. Flujo

1. UI refleja el cambio inmediatamente (id temporal si es creación).
2. Operación remota corre en background.
3. Éxito → confirmar (reemplazar id temporal, marcar sincronizado).
4. Error → revertir + mostrar error con reintentar.

### 5.2. Reglas

- Creación: id temporal con prefijo `temp-`.
- Actualización: aplicar inmediatamente; en error, restaurar snapshot previo.
- Eliminación: ocultar inmediatamente; en error, restaurar.
- Elementos pendientes: distinguir visualmente (opacity, badge).
- Acciones bloqueadas mientras el elemento tenga id temporal.

### 5.3. Invalidación de caches downstream

Tras éxito de mutación: invalidar cache servidor, cache navegador, snapshots estáticos. Vía servicio de aplicación. No tocar cache directo desde componente.

### 5.4. Errores

- Observable (toast o inline).
- Mensaje accionable.
- Reintentos automáticos para errores de red transitorios (límite + backoff).
- Errores de negocio no se reintentan automáticamente.

### 5.5. Excepciones (NO optimistic)

| Operación | Razón |
|---|---|
| Auth (login/logout) | Estado autenticado crítico |
| Pagos / billing | Confirmación del gateway obligatoria |
| Operaciones destructivas que afectan a terceros | Confirmar antes de notificar |
| Cambios de plan / permisos | Implicaciones de billing/autorización |
| Ejecuciones largas (export, import, PDF) | Mostrar progreso real |

Para no-optimistic: estado `{ kind: "idle" | "running" | "ok" | "error" }` con feedback visible.

---

## 6. Anatomía top-level de la capa

```
views/
├── <frontier-public>/         # Frontera pública (sin auth)
├── <frontier-admin>/          # Frontera administrativa (auth + permisos del usuario)
├── <frontier-superadmin>/     # Frontera privilegiada (auth + rol operador)
└── <frontier-landing>/        # Marketing / landing pages
```

| Subcarpeta | Crear cuando |
|---|---|
| `<frontier-public>/` | Existe vista accesible sin autenticación con su propio routing y layout |
| `<frontier-admin>/` | Existe panel del usuario autenticado con permisos del producto |
| `<frontier-superadmin>/` | Existe panel privilegiado para operadores internos con rol distinto |
| `<frontier-landing>/` | Existe página de marketing independiente del flujo del producto |

Las **fronteras hermanas no comparten código entre sí**. Funcionalidad común vive en capa inferior (dominio, aplicación, utilidades). Duplicación entre fronteras es deseada cuando el cambio futuro es independiente. Una carpeta `shared/` o `common/` cross-frontier es antipatrón.

---

## 7. Cache

La vista consume cache. No la implementa.

### 7.1. Datos (3 niveles)

| Nivel | Quién escribe |
|---|---|
| Borde / CDN | Framework (configuración de página) |
| Memoria del servidor | Servicio de aplicación |
| Almacenamiento del navegador | Provider de la vista |

**Reglas:**
- Provider lee cache local antes de suscribirse a remoto.
- Datos remotos sobrescriben cache local al primer valor.
- Escribir cache local solo después del primer valor remoto real.
- Invalidar tras mutaciones vía servicio. No borrar keys directo.

### 7.2. Imágenes

- Toda imagen externa pasa por el gestor del proyecto.
- El gestor expone hooks que retornan URL local cacheada o placeholder.
- Renderizar placeholder mientras carga. Nunca imagen rota.
- Versionado de URL: cuando el origen cambia, la URL versionada cambia.
- Warmup: pre-cargar lote en una operación.

### 7.3. Anti-patrones

- Acceso directo a almacenamiento del navegador desde componente UI ordinario.
- Borrado manual de keys de cache.
- Renderizar URL externa de imagen sin pasar por el gestor.
- Esperar carga de cache para renderizar (sin hidratación).
- Persistir estado vacío en cache local.

### 7.4. Excepciones — acceso directo al almacenamiento

| Caso | Permitido |
|---|---|
| Provider de auth con hidratación síncrona en `useLayoutEffect` | ✅ |
| Feature flag UI simple (modo dev, tema, timestamp) | ✅ |
| Provider de datos con hidratación desde KV cache | ✅ |
| Componente UI ordinario leyendo configuración del dominio | ❌ |
| Estado compartido por >1 consumidor sin encapsular | ❌ |

**Reglas de seguridad** cuando se accede directo: `try/catch` para SSR; `try/catch` para quota.

**Encapsular en hook** cuando >1 consumidor, o cuando hay escritura coordinada con UI.

---

## 8. Cohesión y acoplamiento

### 8.1. Cohesión alta

**Indicadores:**
- Responsabilidad nombrable en una frase corta.
- Cambios afectan solo a archivos del módulo.
- API pequeña y consistente.
- Archivos cambian juntos por las mismas razones.

**Rechazar:**
- Agrupación por tipo técnico, no por responsabilidad.
- Cambios pequeños tocan muchos archivos.
- Descripción del módulo necesita conjunciones.

### 8.2. Acoplamiento bajo

**Indicadores:**
- Cada módulo expone solo lo necesario.
- Dependencias en una sola dirección.
- Cambios internos no requieren cambios en consumidores.
- Reemplazable por otro con la misma API.

**Rechazar:**
- Cambio interno propaga a consumidores.
- Conoce detalles internos de otro módulo.
- Dependencias bidireccionales o circulares.
- Acceso a propiedades privadas.

### 8.3. Soberanía de módulos hermanos

- No comparten código entre sí.
- Funcionalidad común vive en capa inferior compartida.
- Duplicación entre hermanos es deseada.

---

## 9. Cómo desacoplar

Aplicar en orden:

1. **Inversión de dependencias**: introducir contrato abstracto entre A y B; ambos lo conocen, no se conocen entre sí.
2. **Extracción a capa inferior**: lógica agnóstica → utilidades; lógica de dominio → entidad/función pura del dominio; orquestación → servicio de aplicación. Nunca a capa lateral.
3. **Eventos**: A emite, B se suscribe; ambos solo conocen el contrato del evento.
4. **Composición sobre herencia**: componer primitivas pequeñas; no extender una base común.

---

## 10. SOLID

- **SRP**: una responsabilidad, una razón para cambiar.
- **OCP**: extender agregando, no modificando. Registros declarativos, props parametrizables, catálogos de defaults.
- **LSP**: variantes con mismo contrato externo (input, output, intercambiables).
- **ISP**: hooks/servicios/componentes con interfaces mínimas. Hooks pequeños sobre hooks con muchos selectores.
- **DIP**: depender de hooks (no stores), servicios (no adaptadores), tipos del dominio (no de infraestructura).

---

## 11. DDD

### 11.1. La vista no contiene reglas de negocio

Importar del dominio: validaciones de invariantes, cálculos derivados, máquinas de estado, constantes con significado de dominio.

### 11.2. Bounded contexts

Un módulo no conoce internals de otros. Si dos contextos colaboran: contrato explícito y mínimo, documentado.

### 11.3. View Model

Cuando múltiples vistas consumen datos derivados similares: introducir View Model.
- Compone datos crudos en estructuras significativas.
- Expone funciones tipadas.
- Se construye una vez por sesión, se consume vía hook.
- La UI nunca toca datos crudos.

### 11.4. Single source of truth

Cada contexto tiene un único punto que obtiene datos externos. Lo demás los recibe vía hooks/providers.

---

## 12. Naming

### 12.1. Reglas

- Revelar intención. Si requiere leer la implementación para entenderse, está mal.
- Distinciones significativas. Diferencias de nombre = diferencias reales.
- Pronunciables y buscables.
- Componentes/clases: sustantivos.
- Métodos/funciones: verbos.
- Una palabra por concepto en todo el sistema.

### 12.2. Smells

| Smell | Mejor |
|---|---|
| `data`, `info`, `temp`, `obj`, `value` | Nombre que revele qué representa |
| `handleClick`, `onClick` | `handleSubmitOrder`, `handleDeletePhoto` |
| `flag`, `flag2` | Nombre del estado |
| Abreviaturas crípticas | Nombres completos |
| Booleanos negativos (`isNotActive`) | Positivos (`isActive`) |
| Tipo embebido (`userArray`, `priceFloat`) | Sin tipo (`users`, `price`) |

### 12.3. Convenciones técnicas

| Tipo | Convención |
|---|---|
| Componentes (JSX) | PascalCase + `.tsx` |
| Funciones puras / utilidades | kebab-case + `.ts` |
| Tipos | kebab-case con sufijo descriptivo |
| Validadores | kebab-case con sufijo `.validator` |
| Stores | kebab-case con sufijo `-store` |
| Variables, funciones, parámetros | camelCase |
| Componentes y tipos en código | PascalCase |
| Constantes module-level | UPPER_SNAKE_CASE |
| Hooks de React (identificador) | camelCase con prefijo `use` |
| Generic type params | nombres descriptivos PascalCase |
| Carpetas | kebab-case |

**Naming de archivos de hooks** según ubicación:

| Ubicación | Convención |
|---|---|
| Hooks utility cross-feature (en `<modulo>/hooks/`, `<modulo>/data/hooks/`) | kebab-case con `use-` + `.ts` |
| Hooks específicos de feature (en `<feature>/hooks/`) | camelCase con `.ts`, idéntico al nombre del hook exportado |

---

## 13. Anatomía de un feature

### 13.1. Escala según complejidad

| Tipo | Anatomía |
|---|---|
| Mínimo (listado, dashboard read-only, detalle simple) | Solo orquestador |
| Pequeño (read-only con sub-secciones) | Orquestador + sub-componentes + helpers locales si aplica |
| Medio (CRUD básico sin formulario complejo) | + mutations hook |
| Completo (formulario + validación + mutaciones) | + form hook + validator + types + helpers |
| Especial (auto-save, streams, lifecycle complejo) | Hook lifecycle propio en lugar del estándar |

Empezar mínimo. Descomponer cuando aparece el dolor. No anticipar.

### 13.2. Archivos posibles

| Archivo | Cuándo aplica |
|---|---|
| `<Feature>Screen.tsx` (orquestador) | Siempre |
| Sub-componentes (`<Feature>Row`, `<Feature>FormModal`, ...) | Secciones ≥ 50L o repetición ≥ 3× |
| `hooks/use<Feature>Mutations.ts` | Hay mutaciones |
| `hooks/use<Feature>Form.ts` | Formulario complejo o reusado |
| `hooks/use<Feature>Filter.ts` | Filtrado complejo |
| `<feature>.validator.ts` | Validación reusada o reglas combinables |
| `<feature>-types.ts` | Types compartidos entre orquestador, sub-componentes, validator |
| `<feature>-helpers.ts(x)` | ≥2 archivos del feature comparten un helper |
| `index.ts` | Feature exporta más de un símbolo |

### 13.3. Form State

```
<feature>-types.ts        → FormState, EMPTY_FORM
<feature>.validator.ts    → validator puro
hooks/use<Feature>Form.ts → estado usando types + validator
<Feature>FormModal.tsx    → consume hook + renderiza
```

- Componente NO declara `useState` para form data ni valida inline.
- Hook expone API consistente: `{ form, setForm, touched, setTouched, submitted, setSubmitted, updateField, resetForm }`.
- Si varias features comparten mecánica: hook genérico (`useFormState<T>`).

### 13.4. Validator

- Vive en `<feature>.validator.ts`. Pura, sin React, sin estado.
- API consistente: `fieldError(name, value, touched, submitted)`, `isValid(...)`, `hasErrors(values)`.
- Reglas declarativas combinables: `[required(), minLength(n), pattern(...)]`.

### 13.5. Sub-componente presentational

- Datos y callbacks como props. Sin side effects, sin lógica de negocio.
- No decide qué mostrar; el orquestador decide vía props.
- **Excepción §21.4**: leer store global con selectores específicos para evitar prop drilling masivo, si los selectores no se infieren del orquestador, son granulares (§18.1) y está documentado.

### 13.6. Mutations hook

- Vive en `hooks/use<Feature>Mutations.ts`.
- Funciones nombradas por intención: `createX`, `updateX`, `deleteX`, `swapOrder`.
- Cada función: tempId si crea → optimistic → service → éxito (id real + invalidar caches) | error (revertir + mostrar).
- Expone `actionLoading: string | null` para deshabilitar UI por elemento. No retorna JSX. No maneja navegación.

### 13.7. Helpers locales

- Vive en `<feature>-helpers.ts(x)`. Solo elementos usados por ≥2 archivos del mismo feature.
- 1 consumidor: vive en ese consumidor. Usado por features distintas: subir de nivel.
- Helpers son puros o sub-componentes presentational.

### 13.8. Section organization

Cuando un orquestador supera el tamaño: identificar sections cohesivas, marcarlas con comentarios `{/* ── Section: <Nombre> ── */}`, extraer cada una a sub-componente intent-revealing. Orquestador queda como composición sin JSX inline complejo.

---

## 14. Funciones y componentes

### 14.1. Una sola cosa

Si se describe con "y" o "además": descomponer.

### 14.2. Tamaños

| Tipo | Límite |
|---|---|
| Componente orquestador | 200L |
| Sub-componente | 150L |
| Hook | 100L |
| Provider de contexto | 150L |
| Función pura / utilidad | 50L |

**Excepciones legítimas:**
- Índices/catálogos declarativos.
- Contratos de tipos.
- Tablas de defaults.
- Recursos visuales con densidad inherente.
- Primitives UI con interacción densa (visor, picker, cropper, editor visual, timeline editor).
- Orquestadores CRUD multi-modal cuyo JSX es coordinación irreductible tras delegar lógica a hooks y sub-componentes.
- Variantes soberanas de un sistema basado en registry — cada variante es decisión de diseño completa con layout/animación propios; no se descompone para forzar DRY entre variantes.

### 14.3. Pocos argumentos

Más de 4 parámetros: agrupar en objeto tipado o descomponer la función.

### 14.4. Booleans

| Tipo | Regla |
|---|---|
| Flag de comportamiento (`includeInactive`, `retry`, `short`) | ❌ Prohibido. Separar en funciones distintas o usar discriminated union |
| Estado UI observable (`disabled`, `checked`, `open`, `error`, `valid`) | ✅ Permitido |
| Mapas de booleans paralelos por campo (`errors`, `permissions`) | ✅ Permitido |

Mutuamente exclusivos: discriminated union. Independientes: mapa de booleans.

### 14.5. Sin output arguments

No mutar parámetros. Retornar valores explícitamente.

### 14.6. Sin side effects ocultos

Si el nombre dice `getX()`, no modificar estado. Renombrar o separar.

---

## 15. Comentarios

### 15.1. Cuándo SÍ

- Justificación de decisión no obvia.
- Warning de comportamiento sutil (race conditions, contratos implícitos del framework).
- Referencia a documentación externa.
- Invariante no expresable en tipo.
- Documentación de API pública (hooks, servicios, componentes reutilizables).
- Marcadores de section (`── Section: ──`).

### 15.2. Cuándo NO

- Repetir lo que el código dice.
- Explicar nombre malo (renombrar).
- Código comentado (borrar).
- Comentarios obsoletos.
- Banners decorativos excesivos.

### 15.3. Prohibidos

`// TODO`, `// FIXME`, `// HACK`, `// XXX` — crear issue, no comentario.

---

## 16. Error handling

### 16.1. Operaciones asíncronas

1. Distinguir tipos: red, validación, permiso, dominio.
2. Mensaje accionable al usuario.
3. Permitir reintentar si recuperable.
4. Revertir estado optimistic cuando aplique.
5. Registrar para observabilidad. No exponer detalles técnicos.

### 16.2. Reglas

- No retornar `null`/`undefined` para errores. Discriminated unions: `{ kind: "ok", data } | { kind: "error", message }`.
- No pasar `null` para indicar ausencia. Opcional explícito (`?`) o tipo Option/Maybe.
- No tragar errores. Si se ignora intencionalmente, comentar el porqué.
- Errores de negocio: Result/Either del dominio, no excepciones.

### 16.3. Error boundaries

Cada módulo tiene error boundary en su raíz: captura errores de hijos, muestra fallback, permite recuperación.

### 16.4. Validación

La vista presenta errores. No decide qué es válido. Reglas en validator del feature (§13.4).

---

## 17. Tipado

### 17.1. Prohibido

`any`, `as any`, `@ts-ignore`, `@ts-expect-error`, deshabilitación de reglas del linter sin justificación documentada.

### 17.2. Obligatorio

- Discriminated unions para estados con múltiples formas.
- Props readonly cuando representan datos no mutables por el componente.
- Generic constraints cuando un componente reutilizable preserva el tipo del consumidor.
- Narrowing explícito (guards) en lugar de casts.
- Type assertions específicas; nunca casts genéricos.

### 17.3. Cuando TS no infiere

1. Mejorar tipos del origen.
2. Discriminated unions.
3. Generic constraints.
4. Type assertions narrow.

Si nada funciona: hay un problema de diseño previo.

---

## 18. Performance

### 18.1. Suscripción granular en stores globales

> Store global = store reactivo compartido entre componentes.

Suscribir cada selector individualmente; cada componente se renderiza solo si los selectores que consume cambian.

**Prohibido**: hook que agrupa N selectores de un store global y retorna objeto memoizado (causa re-renders en cascada). Cada componente accede al store con sus selectores específicos directamente.

### 18.2. `useMemo` de objetos

| Caso | Permitido |
|---|---|
| Context provider value | ✅ |
| Hook que compone state local + handlers (no toca store global) | ✅ |
| Memoización de cálculo costoso que retorna objeto | ✅ |
| Composer de N selectores de store global | ❌ |

### 18.3. Memoización selectiva

Aplicar `useMemo`, `useCallback`, `React.memo` solo con beneficio medible (cálculos costosos, valores pasados a componentes memoizados, dependencias de hooks). No memoizar por defecto.

### 18.4. Code splitting

Diferir carga no crítica para primer render: variantes de catálogo grande, pantallas secundarias, features condicionales.

### 18.5. Race condition guards

Toda async que actualiza UI: identificador de petición incremental, flag de cancelación en cleanup, flag de montaje.

### 18.6. Render budget

Render < 16ms (60fps). Listas > 100 items visibles: virtualizar. Animaciones: `transform` y `opacity`; nunca `width`/`height`/`left`/`top`.

---

## 19. Cliente vs servidor

**Requiere directiva de cliente:**
- Manejadores de eventos.
- Hooks de estado, efectos o contexto.
- Acceso a APIs del navegador.
- Stores con suscripción reactiva.
- Providers que mantienen estado.

**No requiere:**
- Componentes presentacionales puros.
- Funciones puras.
- Archivos de solo tipos.
- Componentes de servidor.

---

## 20. Anti-patrones (índice)

| Anti-patrón | Sección | Excepción §21 |
|---|---|---|
| Componente con lógica de negocio embebida | §11.1 | inviolable |
| Hook composer agrupando selectores de store global | §18.1 | — |
| Reimplementar reglas del dominio | §11.1 | inviolable |
| Acoplar variantes soberanas vía abstracción común | §8.3 | — |
| Compartir código entre módulos hermanos soberanos | §8.3 | inviolable |
| `any`, `as any`, supresiones de tipo | §17.1 | inviolable |
| Lógica inline auto-ejecutada en JSX | §14 | — |
| Bloques largos de copy/configuración hardcodeados | §6 | §21.1 (catálogo declarativo) |
| Modal/drawer/panel inline > 30L | §13 | — |
| Componente UI ordinario accede directamente a APIs del navegador o I/O externo | §2.2 | inviolable |
| Helpers con conocimiento de dominio en utilidades agnósticas | §3 | — |
| Importar entre módulos hermanos | §8.3 | inviolable |
| Comentarios `TODO`/`FIXME`/`HACK` | §15.3 | — |
| Boolean flags de comportamiento como parámetros | §14.4 | §21.1 (patrón nombrado) |
| Output arguments / mutación de parámetros | §14.5 | — |
| URLs externas de imágenes sin gestor | §7.2 | — |
| Almacenamiento del navegador desde componente UI ordinario | §7.4 | §21.4 (provider auth/data) |
| Esperar al servidor antes de actualizar UI en mutaciones de edición | §5 | §21.1 (auth/billing/destructivas/largas) |
| Esperar carga de cache para renderizar | §7.3 | — |
| Booleans negativos en naming | §12.2 | — |
| Nombres genéricos sin contexto | §12.2 | — |
| Tragar errores silenciosamente | §16.2 | §21.3 (UX silent fail) |
| Retornar `null` para indicar error | §16.2 | — |
| Validación de negocio en la vista | §16.4 | inviolable |
| Form state inline con `useState` en componente | §13.3 | — |
| Reglas de validación inline | §13.4 | — |
| Sub-componente con side effects o lógica de negocio | §13.5 | §21.4 (selector granular justificado) |
| Mutación implementada en componente | §13.6 | — |
| Helper de feature usado por un solo consumidor | §13.7 | — |

---

## 21. Excepciones legítimas por contexto

Estas reglas tienen excepciones aceptables cuando aplicarlas dañaría algo más valioso que la consistencia normativa. Toda excepción debe ser documentada inline en el código con la categoría correspondiente.

### 21.1. FEATURE — Decisión de UX/producto

| Caso típico | Ejemplo |
|---|---|
| Operación intencionalmente NO optimistic | Auth, pagos, cambios de plan, ejecuciones largas (§5.5) |
| Verbo genérico aceptado como patrón nombrado | `handler`, `dispatcher`, `processor` cuando el rol estructural es claro |
| Catálogo declarativo grande | Registry de variantes, tablas de defaults |

Documentar como: `// FEATURE: <comportamiento intencional>`

### 21.2. COST — Optimización de rentabilidad

| Caso típico | Ejemplo |
|---|---|
| Memoización omitida cuando no hay beneficio medible | Cálculos baratos sin `useMemo` |
| Suscripción gruesa cuando granular sobreingenia | Componente con render barato lee múltiples selectores |
| Code splitting omitido en pantalla principal | Pantalla crítica con bundle inline |

Documentar como: `// COST: <decisión y trade-off>`

### 21.3. UX — Silent fail / fallback que protege experiencia

| Caso típico | Ejemplo |
|---|---|
| Catch silencioso en operación no crítica | Telemetría que falla sin abortar render |
| Fallback graceful a placeholder | Imagen rota → placeholder; cache miss → vista vacía |
| Error boundary local con fallback minimal | Sub-sección que falla sin tirar la vista entera |

Documentar como: `// UX: <razón por la que el silencio protege la experiencia>`

### 21.4. STRUCT — Estructura previa garantiza el invariante

| Caso típico | Ejemplo |
|---|---|
| Selector granular en sub-componente para evitar prop drilling | Selectores específicos documentados (§13.5) |
| Provider lee almacenamiento del navegador con hidratación síncrona | `useLayoutEffect` para auth/feature flag (§7.4) |
| Componente asume permiso porque la frontera ya verificó | No re-verificar auth en cada componente del frontier-admin |

Documentar como: `// STRUCT: <qué upstream garantiza el invariante>`

### 21.5. Reglas SIN excepciones (inviolables)

Estas reglas protegen la integridad fundamental de la capa. No admiten excepciones por costo, UX o producto.

- §3 Direcciones: vistas nunca importan de infraestructura directamente.
- §3 Direcciones: vistas hermanas (entre fronteras) nunca se importan entre sí.
- §11.1 Lógica de negocio: cero reglas de dominio implementadas en la vista.
- §16.4 Validación: cero validación de negocio en la vista (delegada al validator del feature o al dominio).
- §17.1 Tipado: cero `any`, `as any`, `@ts-ignore`, `@ts-expect-error`, supresiones de linter.
- §2.2 Cero acceso directo del componente UI ordinario a APIs del navegador o I/O externo.

---

## 22. Checklist pre-merge

- [ ] Solo presentación y orquestación; lógica de estado en hooks; cálculos de negocio en dominio.
- [ ] Form state en hook; validación en validator puro.
- [ ] Cohesión alta + acoplamiento bajo (responsabilidad nombrable, sin internals de hermanos).
- [ ] Anatomía del feature al nivel que la complejidad justifica.
- [ ] Mutaciones de edición optimistic (excepciones §5.5 documentadas).
- [ ] Estados representados (loading, ready, empty, error).
- [ ] Imágenes vía gestor; mutaciones invalidan caches downstream.
- [ ] Cero `any`, supresiones de tipo, comentarios de deuda.
- [ ] Discriminated unions para estados con múltiples formas.
- [ ] Funciones/componentes ≤4 parámetros; sin flags booleanos de comportamiento.
- [ ] Tamaños dentro de límites (o excepción §14.2 documentada).
- [ ] Convenciones de archivos e identificadores aplicadas.
- [ ] Directiva cliente/servidor marcada.
- [ ] Selectores granulares en stores; memoización donde aporta.
- [ ] Race guards en async.
- [ ] Cualquier anti-patrón de §20 presente tiene excepción §21 documentada inline.
- [ ] Reglas inviolables (§21.5) cumplidas sin excepción.
- [ ] TSC EXIT 0 + linter pasa.
