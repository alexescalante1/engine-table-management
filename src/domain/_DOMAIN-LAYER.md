# Arquitectura de la capa de Dominio

Reglas normativas para `domain/`. Romper una regla solo si se justifica por una excepción documentada. En el dominio las excepciones son más restrictivas que en otras capas: la pureza es no negociable.

> **Norte rector**: el dominio es el centro. Define el lenguaje del negocio: entities, value objects, aggregates, reglas de negocio puras, contratos (puertos y repositorios), errores. No conoce a nadie. Ninguna otra capa, ningún framework, ninguna librería externa con side effects.
>
> **Objetivos meta**: pureza absoluta (cero I/O, cero side effects), cohesión por bounded context, ubiquitous language coherente entre código y negocio. SOLID y DDD son los principios guía. La capa es la **fuente de verdad** del negocio: si una regla cambia, cambia aquí.
>
> Las reglas son el ideal. Cada una admite excepciones documentadas (§18) cuando aplicarla rompe el negocio o la práctica. Las reglas inviolables están listadas en §18.4.

---

## 1. Responsabilidades

**Roles fundamentales:**
- Definir el **lenguaje del negocio** (ubiquitous language): entidades, value objects, aggregates con sus invariantes.
- Implementar **reglas de negocio puras**: validators, calculators, derivers, state machines, predicates.
- Declarar **contratos** que otras capas implementan u orquestan: puertos (interfaces hexagonales), repositorios (interfaces de persistencia), errores (catálogo).
- Centralizar **constants paramétricos del negocio** como single source of truth: límites, tarifas, configuraciones, ventanas temporales.

**NO:**
- Conocer cualquier otra capa (aplicación, infraestructura, vistas).
- Importar frameworks o librerías con side effects.
- Realizar I/O (red, disco, base de datos, navegador).
- Mantener estado mutable global.
- Tener side effects (logs, métricas, eventos sin parámetro de salida explícito).

Cuando una operación requiere I/O, orquestación, o conocimiento de runtime: declarar un puerto en el dominio y dejar que otra capa lo implemente.

---

## 2. Direcciones de dependencia

```
Dominio  ←  (capas externas dependen del dominio; el dominio no depende de ellas)
Dominio  →  (nada externo)
Dominio  →  Utilidades agnósticas SIN side effects (excepción acotada)
```

> **Capa central** = en Onion architecture, el dominio es el círculo más interno. Todo apunta hacia él; él no apunta a nadie. La inversión de dependencias es total: las capas externas implementan los contratos del dominio, no al revés.

**Prohibido:**
- Cualquier archivo importa de aplicación, infraestructura o vistas.
- Cualquier archivo importa frameworks de UI, runtime de servidor, SDK de proveedores, librerías HTTP/DB/storage/auth.
- Cualquier archivo importa código con side effects (logging, métricas, telemetría).

**Permitido (excepción acotada):**
- Importar utilidades agnósticas al runtime: generadores de ID puros, helpers de manipulación de strings/dates puros, sin side effects ni I/O.

---

## 3. Building blocks de DDD

| Building block | Definición | Ubicación típica |
|---|---|---|
| **Entity** | Tipo con identidad. Tiene un ID que persiste entre cambios de estado | `entities/<context>/` |
| **Value Object** | Tipo sin identidad, inmutable, semánticamente significativo. Igualdad por valor | `entities/<context>/value-objects/` o inline |
| **Aggregate** | Cluster de entities + VOs con una raíz que mantiene invariantes. Las mutaciones pasan por la raíz | `entities/<context>/` |
| **Domain Service (función pura)** | Operación de negocio que no pertenece naturalmente a una entidad. Pura, determinística | `entities/<context>/<archivo>.ts` |
| **Repository (interfaz)** | Contrato de persistencia para un aggregate root | `repositories/<entity>.repository.port.ts` |
| **Port (interfaz)** | Contrato hexagonal para colaborador externo (gateway, auth, cache, email) | `ports/<capability>/<port>.port.ts` |
| **Domain Error** | Códigos discriminados del catálogo del negocio | `errors/types.ts` |
| **Constants** | Reglas paramétricas del negocio (limits, configs, timeouts semánticos) | `entities/<context>/<context>-rules.ts` o `<context>/configs.ts` |

### 3.1. Reglas de uso

- Una regla de negocio que cambia con el tiempo (precio, límite, política) vive como **constante** del dominio, no hardcodeada en código de aplicación.
- Una regla que opera sobre datos persistidos (validación de invariantes, derivación de estado) vive como **función pura** del dominio.
- La **persistencia de un aggregate root** vive como **repositorio** (`repositories/<entity>.repository.port.ts`).
- Una **capacidad externa no-persistencia** (enviar email, autenticar, gateway de pago, audit, cache, media URLs) vive como **puerto** (`ports/<capability>/`).
- Un caso de error categorizable del negocio vive en el **catálogo de errores** del dominio.

### 3.2. SOLID en domain

| Principio | Manifestación en domain |
|---|---|
| **SRP** | Cada bounded context modela un solo concepto del negocio; una función pura cambia por una sola razón (cambio de regla del negocio). |
| **OCP** | Constants paramétricos + state machines como derivers permiten extender (agregar variante, agregar estado) sin modificar consumers. |
| **LSP** | Variantes de aggregate intercambiables a través del tipo del dominio. |
| **ISP** | Puertos compuestos por sub-interfaces (read+write+batch+snapshot, autenticación+observación). Cada adapter implementa solo lo que necesita. |
| **DIP** | El dominio define los contratos; las capas externas implementan. Inversión total: nadie depende de implementaciones, todos dependen de abstracciones del dominio. |

---

## 4. Pure functions

Las funciones del dominio son **puras**: dado el mismo input, retornan el mismo output, sin side effects, sin acceso a estado externo.

### 4.1. Reglas

- Reciben todo lo necesario por parámetros (no acceden a globals).
- Cero I/O (red, disco, base de datos).
- Cero side effects observables fuera del valor de retorno.
- Determinísticas: mismo input → mismo output.
- Sin mutación de parámetros (input readonly, retornar nuevo valor).
- Tiempo como parámetro inyectado: `(now: number = Date.now())` con default. Permite uso natural y testeo determinístico.
- Aleatoriedad como parámetro inyectado cuando aplique: el dominio puede usar la API global del lenguaje internamente solo si la función expone un override para tests.

### 4.2. Anti-patrones

- Función pura que accede a `Date.now()` en lógica crítica sin parámetro override.
- Función pura que muta su input.
- Función pura que llama a `console.log` u otro side effect.
- Función pura que depende de un singleton mutable.
- Función pura que invoca un puerto del dominio (los puertos son interfaces; las invocaciones suceden en otras capas).

---

## 5. State machines y derivers

Cuando una entidad tiene estados con transiciones bien definidas, expresar el estado como **derivación pura** del estado persistido + tiempo + contexto.

### 5.1. Reglas

- Estados derivados se calculan con función pura, no se persisten.
- Los inputs incluyen los campos crudos persistidos + el instante actual + cualquier contexto necesario para decidir.
- El output es un value object inmutable (`<Aggregate>State`).
- Las transiciones se modelan como condiciones en la derivación, no como mutaciones imperativas.
- Si la función usa la API global del lenguaje para tiempo, lo hace solo como default del parámetro.

### 5.2. Anti-patrones

- Estado computado almacenado en la persistencia (genera divergencia con la realidad temporal).
- State machine implementada como flags booleanos sueltos en la entidad.
- Derivación con side effects (logging del estado derivado en la función misma).
- Derivación que modifica el estado persistido (debe limitarse a calcular).

---

## 6. Anatomía del dominio

### 6.1. Top-level del dominio

```
domain/
├── entities/        # El negocio mismo: bounded contexts (aggregates + VOs + funciones puras + constants)
├── errors/          # Catálogo único de errores categorizables (cross-cutting del negocio)
├── ports/           # Contratos hexagonales: capacidades externas no-persistencia (auth, email, gateway, audit, cache, media)
└── repositories/    # Contratos de persistencia: una interfaz por aggregate root (con variantes transaccionales)
```

| Módulo | Modela | Patrón | Granularidad |
|---|---|---|---|
| `entities/` | El negocio mismo (lenguaje, invariantes, reglas) | DDD: aggregates + VOs + funciones puras | Por bounded context |
| `errors/` | Catálogo discriminado de errores categorizables del negocio | Discriminated union + factory + guards | Cross-cutting |
| `ports/` | Capacidades externas no-persistencia | Hexagonal Pattern (ports & adapters) | Una interfaz por capacidad (descomponible vía ISP) |
| `repositories/` | Persistencia de aggregate roots | Repository Pattern | Una interfaz por aggregate root (+ variantes transaccionales) |

**Por qué la separación top-level:**
- `entities/` define el negocio mismo (estado y reglas). Cambia cuando cambia el lenguaje del negocio. Ningún otro módulo del dominio mezcla este concern.
- `ports/` y `repositories/` son ambos interfaces declaradas por el dominio que la infraestructura implementa, pero modelan concerns distintos: persistencia tiene reglas propias (transacciones, batch, unit-of-work) que no aplican a capacidades como "enviar email" o "autenticar". Mantenerlos separados preserva la distinción semántica entre Repository Pattern y Hexagonal Pattern.
- `errors/` es vocabulario transversal: códigos categorizan fallos de cualquier bounded context. Si viviera dentro de un bounded context, los demás dependerían de él (acoplamiento indeseado entre contextos).

### 6.2. Estructura de un bounded context

```
entities/<context>/
├── <context>.ts                       # Aggregate root + tipos públicos
├── <context>-rules.ts                 # Validators, predicados puros del bounded context
├── <context>-aspects.ts               # Propiedades derivadas (cuando aplica)
├── <context>-<aspect>.ts              # Archivos por aspecto: limits, types, labels, schedule, etc.
├── value-objects/                     # VOs del aggregate
│   ├── <vo-name>.ts
│   └── index.ts
├── <subdomain>/                       # Sub-bounded context (cuando crece)
│   ├── <subdomain>.ts
│   ├── <subdomain>-rules.ts
│   └── ...
├── model/                             # Tipos compartidos en DSL declarativo
├── factory/                           # Constructores del DSL (cuando aplica)
├── queries/                           # Lectores del DSL (cuando aplica)
├── mutations/                         # Modificadores del DSL (cuando aplica)
├── registry/                          # Catálogo de variantes del DSL (cuando aplica)
└── index.ts                           # Barrel del bounded context
```

### 6.3. Cuándo crear cada subcarpeta

| Subcarpeta | Crear cuando |
|---|---|
| `value-objects/` | El aggregate tiene ≥3 VOs reusables o anidados |
| `<subdomain>/` | El bounded context crece y tiene un sub-contexto cohesivo del negocio (ej. un plan dentro de un sistema de suscripción) |
| `model/` | Hay tipos compartidos entre múltiples archivos del bounded context con DSL declarativo |
| `factory/` | El bounded context implementa un DSL con constructores tipados de instancias del modelo |
| `queries/` | El bounded context implementa un DSL con operaciones de lectura/inspección sobre el modelo |
| `mutations/` | El bounded context implementa un DSL con operaciones de modificación pura sobre el modelo |
| `registry/` | El bounded context implementa un DSL con catálogo declarativo de variantes (componentes, tipos registrados) |

### 6.4. Archivos `<context>-<aspect>.ts`

Cuando el bounded context tiene aspectos diferenciados que merecen su propio archivo (sin ser sub-bounded contexts), aplicar el patrón `<context>-<aspect>.ts`:

| Aspecto | Ejemplo de archivo |
|---|---|
| Validadores y predicados | `<context>-rules.ts` |
| Propiedades derivadas | `<context>-aspects.ts` |
| Constants paramétricas | `<context>-limits.ts` o `limits.ts` |
| Tipos enumerados del bounded context | `<context>-type.ts` |
| Labels o constantes de display | `<context>-labels.ts` |
| Configuraciones temporales o de schedule | `<context>-schedule.ts` |

Cada archivo es puro (sin I/O, sin side effects) y agrupa elementos cohesivos del aspecto que su nombre indica.

### 6.5. Anti-patrones

- Bounded context "misceláneo" o "shared" sin nombre semántico del negocio.
- Mezcla de bounded contexts en el mismo archivo (auth + business en un solo `.ts`).
- Subcarpeta con un único archivo cuando el rol no requiere crecimiento previsible.
- Subcarpeta `helpers/`, `utils/`, `lib/` (usar nombres semánticos como `value-objects/`, `<subdomain>/`, `model/`, `factory/`, etc.).
- Archivos `<context>-<aspect>.ts` con aspectos no cohesivos (mezclando rules + types + labels en uno solo).

---

## 7. Ports vs Repositories (distinción)

Aunque ambos son interfaces declaradas en el dominio, conceptualmente difieren:

| Aspecto | Port | Repository |
|---|---|---|
| **Modela** | Capacidad externa (gateway, comunicación, observación, autenticación, logging) | Persistencia de un aggregate root |
| **Granularidad** | Mínima (ISP): una capacidad por interfaz; composición vía sub-interfaces | Una entidad raíz por interfaz; variantes transaccionales aparte |
| **Ubicación** | `domain/ports/<capability>/` | `domain/repositories/` |
| **Sufijo** | `.port.ts` | `.repository.port.ts` (`.repository.tx.port.ts` para variantes transaccionales) |

### 7.1. Reglas

- Cada interfaz declara solo los métodos que el dominio necesita; nunca expone detalles del proveedor que la implementará.
- Composición de sub-interfaces (ISP): una interfaz compuesta por sub-interfaces de capacidades específicas (read + write + batch + snapshot, autenticación + observación de sesión) permite a cada adapter implementar solo lo que necesita.
- Sentinel values del dominio (símbolos especiales para soft-deletes, marcadores de operación) viven aquí para que los adapters los reconozcan.
- Tipos retornados son tipos del dominio, nunca tipos del proveedor.

### 7.2. Estructura interna de `ports/`

```
ports/<capability>/
├── <port>.port.ts              # Una o varias interfaces del capability (sub-ports componibles vía ISP)
├── <sub-capability>.models.ts  # Tipos compartidos de un sub-port (cuando el capability tiene varios)
├── models.ts                   # Tipos compartidos del capability completo
└── index.ts                    # Barrel del capability
```

- Cada capability tiene su propia subcarpeta nombrada en términos del negocio (autenticación, email, gateway de pago, audit, cache, media).
- Una capability puede contener múltiples sub-ports cuando ISP lo justifica: por ejemplo, autenticación se descompone en sub-ports de autenticación, observación de sesión, gateway de sesión y repositorio de auth — cada uno con responsabilidad mínima.
- Si el capability tiene sub-modelos por sub-port (gateway de pago: checkout, gateway, subscription, webhook), cada uno vive en su propio archivo `<sub-capability>.models.ts` además de `models.ts` para tipos compartidos del capability.

### 7.3. Estructura interna de `repositories/`

```
repositories/
├── <entity>.repository.port.ts        # Una interfaz por aggregate root
├── <entity>.repository.tx.port.ts     # Variante transaccional (cuando aplica)
├── unit-of-work.port.ts               # Contrato de transacción atómica multi-aggregate
├── batch-context.port.ts              # Contrato de operaciones batch
├── models.ts                          # Tipos compartidos de persistencia
└── index.ts                           # Barrel del módulo
```

- Estructura **plana por defecto**: un archivo por aggregate root (granularidad estable, un repositorio por aggregate). Cuando varios aggregates pertenecen al mismo bounded context, se permite **agrupar por bounded context** en subcarpetas (`catalog/ operation/ payments/ tenant/ employee/`) para preservar navegabilidad; los archivos transversales (`unit-of-work.port.ts`, `batch-context.port.ts`, `models.ts`, `index.ts`) y los repos cross-cutting quedan en la raíz.
- Variantes transaccionales (`*.tx.port.ts`) coexisten al lado del archivo base cuando el aggregate participa en operaciones atómicas multi-paso.
- Archivos transversales del módulo (`unit-of-work.port.ts`, `batch-context.port.ts`, `models.ts`) viven al mismo nivel; modelan capacidades de persistencia que cruzan repositorios.

### 7.4. Anti-patrones

- Interfaz monolítica que obliga a implementar capacidades no usadas (viola ISP).
- Interfaz que expone tipos del proveedor (rompe la abstracción).
- Repositorio con métodos que pertenecen a otro aggregate root.
- Puerto que mezcla múltiples capacidades no relacionadas.

---

## 8. Catálogo de errores del dominio

### 8.1. Reglas

- Catálogo único de errores como **discriminated union** indexada por código.
- Factory function (ej. `createAppError(code, message?)`) retorna instancia tipada.
- Códigos categorizados por bounded context (auth, validación, business, gallery, etc.).
- Type guards exportados para narrowing desde consumers.
- Mensajes por defecto en el dominio para cada código (la internacionalización se maneja en consumers si aplica).

### 8.2. Estructura del módulo

```
errors/
├── types.ts          # Discriminated union de códigos de error del negocio
├── factory.ts        # Función constructora tipada (createAppError)
├── defaults.ts       # Mensajes por defecto por código
├── guards.ts         # Type guards para narrowing en consumers
├── app-error.ts      # Tipo público AppError
└── index.ts          # Barrel del módulo
```

- Catálogo único top-level porque es **vocabulario transversal**: los códigos categorizan fallos de cualquier bounded context (auth, validación, business, gallery, payment, subscription).
- Si viviera dentro de un bounded context, los demás dependerían de él, generando acoplamiento indeseado entre contextos.
- Cada archivo tiene un rol único (SRP): tipos, construcción, mensajes, narrowing, exportación. La separación facilita extender el catálogo sin tocar archivos no relacionados.

### 8.3. Anti-patrones

- Códigos específicos del proveedor en el catálogo del dominio (rompe abstracción).
- Errores como instancias de `Error` nativo en lugar de la unión discriminada (pierde la categorización por código).
- Catálogo disperso en múltiples archivos sin SSoT.
- Códigos genéricos (`UNKNOWN_ERROR`) usados cuando existe código específico apropiado.

---

## 9. Constants como single source of truth

### 9.1. Reglas

- Constants del negocio (límites, configuraciones, ventanas temporales, tarifas) viven en el bounded context que las posee semánticamente.
- Inmutables: marcar con `as const` o tipos readonly.
- Tipadas: nunca strings o numbers crudos sin contexto del negocio.
- Documentar la unidad y semántica en el nombre o comentario adyacente (`DAY_MS`, `REMINDER_DAYS_BEFORE_EXPIRATION`).
- Cero hardcodeo en código de aplicación o infraestructura: si la constante viene del negocio, vive en el dominio.

### 9.2. Anti-patrones

- Magic numbers en código de aplicación que deberían ser constants del dominio.
- Constants duplicadas en múltiples archivos.
- Configuración de runtime (variables de entorno) confundida con constants del negocio.
- Constants mutables (`let` a nivel módulo).

---

## 10. Pureza y naturaleza de la capa

La capa de dominio es **100% pura** — TypeScript universal, ejecutable en cualquier runtime (Node, navegador, edge) sin cambios. Es la garantía más estricta del proyecto.

| Permitido | Prohibido |
|---|---|
| Tipos primitivos, manipulación pura de strings/numbers/dates | I/O de cualquier tipo (red, disco, base de datos, almacenamiento del navegador, sockets, fetch) |
| Operaciones matemáticas estándar (excepto aleatoriedad sin override) | APIs del navegador (window, DOM, storage del cliente, fetch, request, response) |
| Manipulación de fechas con instante actual inyectado como parámetro | APIs del runtime de servidor (filesystem, cookies, headers, runtime config) |
| Estructuras de datos del lenguaje (`Set`, `Map`, `Array`) y operaciones funcionales | Frameworks de UI (componentes, hooks reactivos, JSX, directivas de framework) |
| Expresiones regulares para validación | SDK de proveedores externos (auth, base de datos, payment, email, storage) |
| Control de flujo, recursión, álgebra de funciones | `console.log` u otros loggers (el logging vive en la capa que orquesta) |
| Crypto **determinístico** sin secrets (raro; usualmente vive en infraestructura) | Aleatoriedad en lógica crítica sin parámetro override |
| | Estado mutable global (variables a nivel módulo escritas por funciones) |
| | Cualquier dependencia que requiera configuración de runtime para ejecutarse |

---

## 11. Naming

### 11.1. Sufijos de archivo

| Sufijo | Rol |
|---|---|
| `.port.ts` | Interfaz hexagonal de capacidad externa |
| `.repository.port.ts` | Interfaz de repositorio de persistencia |
| `.repository.tx.port.ts` | Variante transaccional de un repositorio |
| `-rules.ts` | Validators + limits + predicados de un bounded context |
| `-aspects.ts` | Propiedades derivadas de una entidad |
| Sin sufijo | Aggregate root, value object, función pura del dominio, constants |

### 11.2. Identificadores

| Tipo | Convención |
|---|---|
| Entities, Value Objects, tipos | PascalCase |
| Funciones puras | camelCase con verbo de negocio (`derive`, `calculate`, `is`, `has`, `to`) |
| Predicados booleanos | `isX`, `hasX`, `canX`, `shouldX` |
| Mappers de tipo | `to<DomainType>`, `<source>To<Target>` |
| Constants module-level | UPPER_SNAKE_CASE |
| Discriminated unions | PascalCase con sufijo de tipo (`PaymentStatus`, `SubscriptionState`) |
| Puertos (interfaces) | Prefijo `I` + PascalCase |

### 11.3. Carpetas

kebab-case. Subcarpetas reservadas con semántica fija dentro de un bounded context: `value-objects/`, `<subdomain>/`, `model/`, `factory/`, `queries/`, `mutations/`, `registry/`.

---

## 12. Ubiquitous language

El naming en código refleja el lenguaje del negocio. Si el negocio dice "trial expirado", el código dice `isTrialExpired`, no `hasFlagXSet`.

### 12.1. Reglas

- Términos del negocio se preservan literalmente en el código (sin traducción técnica innecesaria).
- Cada bounded context tiene su glosario implícito en sus archivos `-rules.ts`, `configs.ts` o `types.ts`.
- Cambios en el lenguaje del negocio se reflejan en refactors de naming en el dominio (con deprecación si hay consumers externos).
- Predicados booleanos formulados como pregunta del negocio: `isPlanActive`, `canUserPurchase`, `hasReachedLimit`.

### 12.2. Anti-patrones

- Términos técnicos genéricos donde el negocio tiene términos específicos (`processData` en lugar de `applyPlanUpgrade`).
- Naming inconsistente entre el dominio y la documentación del producto.
- Acrónimos o abreviaciones que oscurezcan el significado del negocio.
- Cambio de naming en el dominio sin actualizar consumers (rompe coherencia).

---

## 13. Tipado

- Cero `any`, supresiones de tipo, deshabilitación del compilador.
- Discriminated unions para state machines y resultados con múltiples formas.
- Value objects y DTOs públicos: campos `readonly`.
- Tuplas y branded types para identificadores fuertemente tipados cuando el negocio lo justifica.
- Type guards exportados para narrowing desde consumers.
- Tipos derivados (`ReturnType`, `Parameters`) cuando reflejan estructura natural del dominio.

---

## 14. Tamaños

| Tipo | Límite |
|---|---|
| Entity / aggregate root (archivo) | 200L |
| Value Object | 100L |
| Función pura (archivo) | 150L |
| Repository port | 80L |
| Port | 50L |
| Catálogo de errores | 300L (puede crecer con el negocio) |
| Constants / configs | 200L |

### 14.1. Excepciones legítimas de tamaño

Estas excepciones aplican solo a los límites de líneas. Para excepciones de regla por contexto, ver §18.

- **Configuración paramétrica del negocio**: tabla de planes, tarifas y límites con todas las variantes (puede legítimamente exceder).
- **State machine compleja con múltiples branches**: el deriver es inherentemente una tabla de transiciones del negocio.
- **Bounded context con DSL declarativo**: contexto que define un lenguaje declarativo extenso (componentes, fields, models) cuya cobertura completa justifica el tamaño.
- **Port/repositorio compuesto por ISP**: interfaz cohesiva de una capacidad amplia descompuesta en sub-interfaces (read + write + batch + snapshot) o un aggregate root extenso (ej. Catalog: products own/barcode + 3 promos + categorías) cuyo contrato completo excede el límite de port/repo sin ser un god-object.
- **Value Object temporal/estructural rico**: VO cohesivo cuyo tipo + operaciones puras inherentes (bounds, slots, constraints, envelope) forman una unidad conceptual que fragmentar dañaría.

Si el archivo excede sin caer en una excepción: descomponer en sub-bounded contexts, helpers privados de archivo, o splitear value objects en archivos propios.

---

## 15. Cohesión y acoplamiento

> Cohesión por bounded context + acoplamiento mínimo entre bounded contexts son los **objetivos meta** del dominio. Cada bounded context describe un concepto del negocio en una palabra y agrupa todo lo necesario para razonar sobre ese concepto.

### 15.1. Cohesión alta

**Indicadores:**
- Cada bounded context se nombra en una palabra del negocio.
- Funciones puras de un context cambian por las mismas razones (cambio de regla del negocio).
- Value objects del aggregate viven cerca del aggregate root.
- Constants y reglas paramétricas viven en el contexto que las posee semánticamente.

**Rechazar:**
- Bounded context "misceláneo" sin nombre del negocio.
- Reglas de un context dispersas en otros contexts sin razón semántica.

### 15.2. Acoplamiento bajo

**Indicadores:**
- Bounded contexts se importan entre sí solo cuando hay relación semántica del negocio (un context derivado importa de su context productor cuando conceptualmente dependen).
- Cero ciclos.
- Repositorios y puertos se referencian por interfaz, nunca por implementación.

**Rechazar:**
- Imports cíclicos entre bounded contexts.
- Bounded context que importa archivos **privados** (`internal/`) de otro. El default es consumir el **barrel** del vecino.

**Excepción cycle-safe**: cuando importar el barrel del vecino cerraría un ciclo (su barrel re-exporta, vía `export *`, un archivo que a su vez importa este context — ej. `business/index` re-exporta `business-schedule` que importa `tenant`), se permite importar el **archivo público específico** (hoja, sin el import que cierra el ciclo). Preserva la acíclica; solo aplica a archivos **públicos**, nunca a `internal/`.

---

## 16. Reglas de barrel

| Alcance | Regla |
|---|---|
| Por bounded context | Cada uno tiene barrel propio que exporta aggregate root + VOs públicos + funciones puras + constants públicos. No exporta archivos privados internos. |
| Barrel principal de la capa | Re-exporta aggregate roots, tipos públicos, catálogo de errores + factory, puertos y repositorios. No re-exporta archivos privados internos. |
| Consumo externo | Consumers (capas externas) importan exclusivamente del barrel principal o de los barrels de bounded contexts. Nunca archivos internos (`internal/`). |
| Cross-context intra-dominio | Default: el barrel del vecino. Excepción cycle-safe (§15.2): archivo público específico cuando el barrel cerraría un ciclo. |

---

## 17. Anti-patrones (índice)

| Anti-patrón | Sección | Excepción §18 |
|---|---|---|
| Domain importa de aplicación, infraestructura o vistas | §2 | inviolable |
| Domain importa framework de UI o librería con side effects | §2 | inviolable |
| I/O dentro del dominio (red, disco, base de datos, navegador) | §10 | inviolable |
| `console.log` o logger dentro del dominio | §10 | inviolable |
| Estado mutable global (variable a nivel módulo escrita por funciones) | §10 | inviolable |
| Acceso a la API global de tiempo en lógica crítica sin parámetro override | §4.2 | §18.1 (default value, no acceso global crítico) |
| Aleatoriedad en lógica crítica sin parámetro override | §10 | §18.1 (caso similar) |
| Función pura que muta su input | §4.2 | — |
| Estado computado almacenado en lugar de derivado | §5.2 | §18.2 (snapshot histórico legítimo) |
| Códigos de error específicos del proveedor en el catálogo del dominio | §8.3 | — |
| Errores como instancias del lenguaje en lugar de unión discriminada | §8.3 | — |
| Magic numbers en código de aplicación que deberían ser constants del dominio | §9.2 | — |
| Bounded context "misceláneo" o "shared" sin nombre semántico | §6.5 | — |
| Mezcla de bounded contexts en el mismo archivo | §6.5 | — |
| Términos técnicos genéricos donde el negocio tiene términos específicos | §12.2 | — |
| `any`, supresiones de tipo, deshabilitación del compilador | §13 | inviolable |
| Subcarpeta `helpers/`, `utils/`, `lib/` | §6.5 | — |
| Repositorio o puerto que expone tipos del proveedor | §7.4 | — |
| Aggregate root mutable expuesto al consumer (debe ser readonly) | §13 | — |
| Interfaz monolítica que obliga implementar capacidades no usadas | §7.4 | — |
| Función pura que invoca un puerto del dominio | §4.2 | — |

---

## 18. Excepciones legítimas por contexto

En el dominio las excepciones son **más restrictivas** que en otras capas. La pureza es el objetivo central. Solo se admiten excepciones cuando aplicarlas literalmente rompe la práctica sin aportar valor real.

| # | Categoría | Caso | Justificación / Documentar como |
|---|---|---|---|
| 18.1 | Default de tiempo o aleatoriedad en función pura | Función pura recibe el instante actual o fuente de aleatoriedad como parámetro con default que invoca la API global del lenguaje | Default permite uso natural; override permite testeo determinístico. Patrón estándar — no requiere comentario inline |
| 18.2 | Snapshot histórico legítimo | Estado computado almacenado para auditoría histórica (no para derivar realidad presente) | `// SNAPSHOT: <razón histórica>` |
| 18.3 | Utility agnóstica externa | Importación de utility agnóstica al runtime (generador de ID puro, helper de string sin side effects) | La utility debe ser declarada como agnóstica en su propio módulo (sin imports de capas externas, sin I/O, determinística) |

### 18.4. Reglas SIN excepciones (inviolables)

Estas reglas protegen la pureza fundamental del dominio. No admiten excepciones por costo, UX, negocio o conveniencia.

- §2 Direcciones: el dominio nunca importa de aplicación, infraestructura o vistas.
- §2 Direcciones: el dominio nunca importa frameworks de UI, runtime de servidor, ni SDKs de proveedores.
- §10 I/O: ninguna operación de red, disco, base de datos, navegador en el dominio.
- §10 Logging: ningún `console.log` o logger dentro del dominio.
- §10 Estado mutable global: prohibido.
- §13 Tipado: cero `any`, supresiones, deshabilitación del compilador.

---

## 19. Checklist pre-merge para nueva regla / aggregate / port del dominio

- [ ] Bounded context identificado y nombrado en una palabra del negocio.
- [ ] Cero imports de aplicación, infraestructura o vistas.
- [ ] Cero imports de frameworks o librerías con side effects.
- [ ] Cero I/O en el código del dominio.
- [ ] Cero `console.log` u otro logger.
- [ ] Cero estado mutable global.
- [ ] Funciones puras: cero acceso a la API global de tiempo o aleatoriedad en lógica crítica sin parámetro override.
- [ ] Aggregate root con tipos `readonly` en value objects y campos públicos.
- [ ] Estados con transiciones modelados como derivación pura (state machine).
- [ ] Errores agregados al catálogo con código discriminado del bounded context apropiado.
- [ ] Constants del negocio centralizadas en el bounded context que las posee.
- [ ] Naming refleja el ubiquitous language del negocio.
- [ ] Sufijos de archivo aplicados: `.port.ts`, `.repository.port.ts`, `-rules.ts`, `-aspects.ts`.
- [ ] Tipos discriminados (discriminated unions) para state machines y resultados con múltiples formas.
- [ ] Cero `any`, supresiones de tipo, deshabilitación del compilador.
- [ ] Tamaños dentro de límites (o excepción §14.1 documentada).
- [ ] Cohesión: bounded context describible en una palabra.
- [ ] Acoplamiento: imports entre bounded contexts solo cuando hay relación semántica del negocio.
- [ ] Barrel del bounded context expone aggregate root + tipos públicos + funciones puras + constants.
- [ ] Cualquier anti-patrón de §17 presente tiene excepción §18 documentada inline (cuando la regla admite excepción).
- [ ] Reglas inviolables (§18.4) cumplidas sin excepción.
- [ ] Compilador de tipos pasa sin errores; linter pasa.
