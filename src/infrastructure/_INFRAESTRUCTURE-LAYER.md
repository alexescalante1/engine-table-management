# Arquitectura de la capa de Infraestructura

Reglas normativas para `infrastructure/`. Romper una regla solo si se justifica por una excepción documentada.

> **Norte rector**: implementar contratos del dominio. Traducir proveedores externos al lenguaje del dominio. Cada adapter es soberano sobre su tecnología. La capa solo conoce el dominio; nunca conoce capas externas.
>
> **Objetivos meta**: cohesión alta dentro de cada capability, acoplamiento bajo entre capabilities. SOLID aplicado en cada adapter. DDD: la capa actúa como **anti-corruption layer** que aísla al dominio de los detalles del proveedor (tipos, errores, semántica). Toda decisión de organización debe servir a estos objetivos.
>
> Las reglas son el ideal. Cada una admite excepciones documentadas (§21) cuando aplicarla rompe el negocio, la rentabilidad o la operación. Una excepción legítima requiere comentario inline que identifique la categoría de la excepción y la justifique. Las reglas inviolables están listadas en §21.6.

---

## 1. Responsabilidades

**Roles fundamentales:**
- Implementar el **patrón puerto-adapter** (hexagonal/onion): cada adapter implementa un puerto declarado en el dominio.
- Actuar como **anti-corruption layer (DDD)**: aislar al dominio de los detalles del proveedor (tipos, errores, semántica). Operativamente: §6 encapsula tipos, §8 traduce errores, §14 valida y mapea DTOs.

**Operaciones permitidas:**
- Integrar proveedores externos (bases de datos, gateways de pago, autenticación, almacenamiento, email, cache).
- Sanear inputs antes de invocar al proveedor (paths, queries, payloads).
- Emitir audit logs estructurados a través del puerto del dominio.

**NO:**
- Conocer la capa de aplicación ni la capa de vistas.
- Implementar reglas de negocio (van en el dominio).
- Orquestar casos de uso (responsabilidad de la capa de aplicación).
- Renderizar UI ni mantener estado de UI.
- Exponer detalles del proveedor al consumer (referencias a SDK, tipos del proveedor, errores nativos).

Cuando se necesita una operación NO permitida: delegar al dominio (regla pura) o a la capa de aplicación (orquestación). La capa de infraestructura nunca conoce upstream.

---

## 2. Direcciones de dependencia

```
Infraestructura  →  Dominio (contratos: puertos, repositorios, errores, entidades)
Infraestructura  →  Utilidades agnósticas
Infraestructura  →  Ambiente (variables de entorno tipadas)
Infraestructura  →  Aplicación  ← PROHIBIDO
Infraestructura  →  Vistas      ← PROHIBIDO
```

> **Contrato del dominio** = puerto, repositorio, factory o tipo declarado en el dominio que la infraestructura implementa o consume.

**Prohibido:**
- Cualquier archivo importa de la capa de aplicación.
- Cualquier archivo importa de la capa de vistas.
- Módulos de infraestructura se importan entre sí, salvo módulos cross-cutting declarados (§13).

---

## 3. Composición local

Cada módulo ensambla sus singletons cableados y los exporta vía barrel. El barrel principal de la capa re-exporta los singletons ya ensamblados. Cómo se consumen desde fuera no es responsabilidad de la capa.

### 3.1. Reglas

- Cada adapter se ensambla con sus dependencias (configuración del ambiente, módulos cross-cutting cuando aplica) en el barrel del capability.
- Los singletons se exportan como constantes con nombre semántico (sin alias del proveedor).
- El barrel principal re-exporta solo singletons pre-ensamblados; expone factories cuando se requiere parametrización runtime que el consumer debe proveer.
- La capa no expone detalles internos: clientes del SDK, configuraciones crudas del proveedor, ni paths internos.

### 3.2. Anti-patrones

- Singleton inicializado fuera del barrel del capability.
- Barrel principal exportando paths internos del capability.
- Adapter expuesto sin pre-ensamblar (consumer debería completarlo).

---

## 4. Organización por capability

Cada carpeta top-level es un **capability soberano**: agrupa todos los adapters de una responsabilidad infraestructural.

### 4.1. Reglas

- Capability nombrable en una palabra (autenticación, base de datos, almacenamiento, email, pagos, cache, audit, boot).
- Cuando el capability tiene múltiples proveedores: subcarpeta por proveedor.
- Cuando el capability tiene múltiples entidades del dominio: subcarpeta `repositories/` con un archivo por entidad.
- Capabilities cross-cutting (compartidos por otros) declarados explícitamente en §13.

### 4.2. Anti-patrones

- Capability "misceláneo" o "common" que no se describe en una palabra.
- Mezcla de proveedores en el mismo archivo cuando hay multi-provider.
- Repositorios de diferentes entidades en el mismo archivo.

---

## 5. Anatomía de un módulo

### 5.1. Estructura

```
<capability>/
├── index.ts                           # Barrel: exporta singletons cableados
├── <capability>.adapter.ts            # Adapter principal (cuando hay un solo proveedor)
├── <provider>/                        # Variantes por proveedor (multi-provider)
│   ├── <provider>.adapter.ts
│   ├── <provider>.verifier.ts         # Verifier (firma, HMAC, autenticidad)
│   └── mappers.ts                     # DTO externo → tipo del dominio
├── repositories/                      # Implementaciones de IXRepository del dominio
│   └── <entity>.repository.ts
├── ports/                             # Puertos PRIVADOS internos de infra (no en domain)
│   └── <internal>.port.ts
├── paths/                             # Generadores de rutas semánticas
├── templates/                         # Composables (HTML, payloads)
└── selectors/                         # Lógica de selección entre proveedores
```

### 5.2. Cuándo crear cada subcarpeta

| Subcarpeta | Crear cuando |
|---|---|
| `<provider>/` | Capability con ≥2 proveedores implementados o anticipados |
| `repositories/` | Capability database con ≥3 entidades del dominio |
| `ports/` | Hay puertos privados internos (driver, registry, selector) |
| `paths/` | Capability storage con esquema de rutas que requiere generadores |
| `templates/` | Capability email/messaging con composables HTML/markdown |
| `selectors/` | Capability multi-provider con lógica de selección no trivial |

### 5.3. Top-level del capability

Reservado para los archivos del flujo principal: adapter principal (si hay un único proveedor), barrel, factory de capability (si aplica).

### 5.4. Anti-patrones

- Helper privado suelto en top-level cuando el capability ya tiene `<provider>/` o subcarpeta apropiada.
- Subcarpeta `helpers/`, `utils/`, `lib/` (usar nomenclatura semántica: `mappers/`, `paths/`, `templates/`).
- Subcarpeta con un único archivo cuando el rol no requiere crecimiento previsible.

---

## 6. Patrón factory + implementación de contratos

### 6.1. Reglas

- Cada adapter se construye con factory function que retorna una interfaz del dominio.
- La interfaz retornada es el contrato del dominio que el adapter implementa.
- Sin operador `new`. Sin clases con estado mutable.
- Las dependencias del adapter (configuración del ambiente, módulos cross-cutting, configs de cliente) llegan como parámetros del factory.
- El adapter retornado es un objeto cuyos métodos capturan las dependencias en su closure.

### 6.2. SOLID en el patrón adapter

Cada principio SOLID tiene una manifestación específica en la capa de infraestructura. El patrón adapter es el mecanismo que los implementa.

| Principio | Manifestación en infraestructura |
|---|---|
| **SRP** | Cada adapter tiene una sola razón de cambio: cambio del proveedor o evolución del contrato del dominio que implementa. Adapters de capabilities distintos (autenticación vs. almacenamiento) viven en módulos distintos. |
| **OCP** | Multi-provider con registry + selector + factory (§10) permite agregar proveedores sin modificar consumers. El consumer recibe la interfaz del dominio; agregar variantes no cambia el código existente. |
| **LSP** | Variantes de un mismo capability son intercambiables a través del contrato del dominio. El selector retorna la interfaz; el consumer no diferencia qué variante recibe. |
| **ISP** | Contratos del dominio compuestos por sub-interfaces (autenticación + observador de sesión, gateway de pago + verificador de webhook). Cada adapter implementa solo la sub-interfaz que su capacidad cubre. |
| **DIP** | Adapters dependen de abstracciones del dominio (puertos, repositorios, errores), nunca de implementaciones concretas. La inversión es total: el dominio define el contrato; la infraestructura lo cumple. |

**Anti-patrones de violación SOLID:**
- Adapter que crece para cubrir capabilities distintos (viola SRP).
- Consumer con switch hardcodeado por nombre de proveedor (viola OCP).
- Variantes que difieren en API observable más allá del contrato (viola LSP).
- Contrato del dominio monolítico que obliga implementar capacidades no usadas (viola ISP).
- Adapter que importa implementación concreta de otro proveedor (viola DIP).

### 6.3. Anti-patrones

- Adapter que NO implementa un contrato del dominio (no hay interfaz declarada que cumpla).
- Adapter que expone tipos del proveedor en su API pública.
- Adapter con clase y estado mutable a nivel de instancia.
- Adapter que usa singleton del proveedor sin envolverlo en factory.

---

## 7. Naming

### 7.1. Sufijos de archivo

| Sufijo | Rol |
|---|---|
| `.adapter.ts` | Adapter de un proveedor concreto que implementa un puerto del dominio |
| `.repository.ts` | Implementación de un repositorio para una entidad del dominio |
| `.verifier.ts` | Adapter que verifica firmas, hashes o autenticidad (webhooks) |
| `.renderer.ts` | Adapter que produce contenido renderizado (HTML, PDF, payloads estructurados) |
| `.factory.ts` | Factory que crea adapters con configuración runtime (multi-provider) |
| `.registry.ts` | Catálogo de adapters disponibles (multi-provider) |
| `.selector.ts` | Lógica de selección entre adapters disponibles |
| `.port.ts` | **Puerto privado de infraestructura** (no debe confundirse con puertos del dominio) |

### 7.2. Identificadores

| Tipo | Convención |
|---|---|
| Factory de adapter | Verbo `create` + nombre del adapter |
| Singleton exportado | camelCase del adapter (sin nombre del proveedor) |
| Mapper de errores | `map<Provider>Error` |
| Mapper de tipos | `to<DomainType>` |
| Type guards | `require<Type>` o `parse<Type>Optional` |

### 7.3. Carpetas

kebab-case. Subcarpetas reservadas con semántica fija: `repositories/`, `ports/`, `paths/`, `templates/`, `selectors/`, `<provider>/`.

---

## 8. Mapeo de errores del proveedor

> Junto con la validación de tipos en boundaries (§14) y el encapsulamiento de tipos del proveedor (§6), el mapeo de errores forma la **anti-corruption layer (DDD)** de la capa: traducción semántica completa del proveedor al dominio. Ningún detalle del proveedor escapa al consumer.

### 8.1. Reglas

- Cada adapter tiene una función `map<Provider>Error(err)` que traduce el error nativo del proveedor a un error del catálogo del dominio.
- El error traducido se lanza con el factory de errores del dominio. Nunca como error nativo del proveedor.
- Códigos del catálogo del dominio. Si no existe el código apropiado: agregarlo al catálogo, no usar genérico.
- El error nativo del proveedor NUNCA escapa al consumer del adapter.
- El mapper traduce códigos conocidos del proveedor a códigos del dominio; el catch-all genérico recae en un código del dominio que indique error de infraestructura.

### 8.2. Anti-patrones

- Lanzar error nativo del proveedor sin traducir.
- Crear códigos de error específicos del proveedor en el catálogo del dominio (rompe la abstracción).
- `try/catch` que silencia el error sin traducir ni loggear.
- Mapper que retorna el error en lugar de lanzarlo.

---

## 9. Puertos privados de infraestructura

Distinción clave entre dos tipos de puertos:

| Tipo de puerto | Ubicación | Consumer |
|---|---|---|
| **Puerto del dominio** | `domain/ports/` | Capa de aplicación (vía dominio) |
| **Puerto privado de infraestructura** | `<capability>/ports/` | Adapters internos del mismo capability |

### 9.1. Cuándo declarar un puerto privado

- Múltiples adapters dentro del mismo capability comparten una abstracción interna (driver de base de datos consumido por múltiples repositorios).
- Lógica de selección o registry necesita un contrato común para variantes.
- El puerto privado nunca es consumido fuera de la capa de infraestructura.

### 9.2. Anti-patrones

- Puerto privado de infraestructura colocado en el dominio (contamina la capa central con detalles de implementación).
- Puerto privado expuesto al consumer externo de la capa.
- Adapter del dominio implementado a través de un puerto privado en lugar del contrato del dominio directo.

---

## 10. Multi-provider pattern

Cuando un capability tiene múltiples proveedores implementados:

### 10.1. Estructura obligatoria

| Componente | Responsabilidad |
|---|---|
| **Registry** | Parsea la configuración del ambiente y construye el catálogo de proveedores disponibles |
| **Selector** | Lógica de resolución por contexto (país, proveedor preferido, capacidad requerida) |
| **Factory** | Crea instancia del adapter con las credenciales correspondientes |

### 10.2. Reglas

- Adapters por proveedor en subcarpeta dedicada.
- Cada adapter implementa la misma interfaz del dominio.
- El factory retorna la interfaz del dominio, nunca el adapter concreto del proveedor.
- El consumer recibe el factory; nunca instancia adapters concretos directamente.
- El registry se construye con datos del ambiente; falla fast si la configuración mínima no está presente.

### 10.3. Anti-patrones

- Multi-provider sin registry+selector+factory cuando hay ≥2 proveedores activos.
- Selector que retorna el adapter concreto del proveedor.
- Switch hardcodeado por nombre de proveedor en el consumer.

---

## 11. Configuración y variables de entorno

### 11.1. Reglas

- Single Source of Truth en un módulo de ambiente tipado.
- Validación eager (falla en boot si configuración crítica falta) o lazy con graceful null cuando la configuración es opcional.
- Adapters reciben configuración via parámetros del factory.
- Schemas o validators centralizados en el módulo de ambiente.

### 11.2. Anti-patrones

- Adapter accede directamente a variables de entorno globales.
- Validación de configuración dispersa en cada adapter.
- Configuración crítica con default silencioso (debe fallar fast).
- Adapter que asume configuración presente sin validar.

---

## 12. Patrones operativos del adapter

| Patrón | Cuándo aplicar |
|---|---|
| **Timeout wrapper** con cancelación abortable | Llamadas HTTP a proveedores externos |
| **Sanitización de paths/queries** | Storage paths, URL builders, queries declarativos |
| **Idempotency key** | Operaciones de mutación que el proveedor soporta como idempotentes |
| **Retry/fallback explícito** | Solo cuando el proveedor lo recomienda y el consumer no lo maneja |
| **Type guards en boundaries** | Conversión de DTOs externos a tipos del dominio |
| **Verificación de firma** | Webhooks: HMAC, freshness, anti-replay |

### 12.1. Reglas

- Cada llamada HTTP externa tiene timeout explícito.
- Cada path/query construido con input externo se sanea antes de invocar al proveedor.
- Cada operación de mutación que el proveedor permite idempotente usa idempotency key.
- Retries solo cuando el proveedor los recomienda; nunca como reemplazo de manejo de errores.

### 12.2. Anti-patrones

- Llamada HTTP sin timeout (puede colgar el proceso indefinidamente).
- Path o query construido por concatenación de strings con input externo sin sanear.
- Idempotency key omitida en operación crítica que el proveedor soporta.
- Retries silenciosos que enmascaran errores reales.

---

## 13. Cross-cutting modules (excepción a soberanía)

Algunos módulos de infraestructura son **transversales** y consumidos por otros módulos de infraestructura. Son excepción legítima a la regla "módulos hermanos no se importan entre sí" (§4).

### 13.1. Categorías permitidas

| Cross-cutting | Razón |
|---|---|
| **Boot/init** | Singleton de cliente compartido del SDK del proveedor (un único cliente, múltiples adapters) |
| **Audit logging** | Logger estructurado consumido por todos los adapters para emitir eventos de observabilidad |

### 13.2. Reglas

- Los módulos cross-cutting están explícitamente declarados en este documento.
- No introducir nuevos cross-cutting sin justificación documentada en este documento.
- Los módulos cross-cutting NO consumen otros módulos de infraestructura (acíclicos).
- Los módulos cross-cutting son delgados (singleton getter, logger) y no contienen lógica de capability específico.

### 13.3. Anti-patrones

- Módulo cross-cutting que importa otro capability de infraestructura.
- Cross-cutting que crece para incluir lógica de capability (debe extraerse a un capability propio).
- Capability normal usado como cross-cutting sin declararlo aquí.

---

## 14. Validación y type guards en boundaries

> Esta sección, junto con el mapeo de errores (§8) y el encapsulamiento de tipos del proveedor (§6), constituye la **anti-corruption layer (DDD)** de la capa. La validación traduce DTOs externos del proveedor a tipos del dominio bien formados; ningún DTO crudo del proveedor cruza al consumer.

### 14.1. Reglas

- En la frontera entre proveedor externo y dominio: validar y convertir.
- Helpers tipados (`require<Type>`, `parse<Type>Optional`) en mappers.
- Función `to<DomainType>(externalDto)` retorna tipo del dominio bien formado.
- Cero `as` casts en mappers; usar type guards o validation runtime.
- Si la validación falla: lanzar error del catálogo del dominio (típicamente código de error de infraestructura o validación).

### 14.2. Anti-patrones

- Casts directos (`as`) en lugar de type guards.
- Mapper que asume estructura del DTO externo sin validar.
- Conversión que silencia campos faltantes con valores por defecto sin documentar.

---

## 15. Tamaños

| Tipo | Límite |
|---|---|
| Adapter | 200L |
| Repository | 150L |
| Mapper | 100L |
| Verifier (webhook, signature) | 200L |
| Port privado | 50L |
| Renderer (con templates) | 300L |

### 15.1. Excepciones legítimas de tamaño

Estas excepciones aplican solo a los límites de líneas. Para excepciones de regla por contexto, ver §21.

- **Adapter de capability con múltiples operaciones**: ej. driver de base de datos con read + write + batch + transaction (legítimamente >200L).
- **Webhook verifier con HMAC + parsing + normalización**: flujo lineal irreductible.
- **Query builder declarativo**: conversión de filtros del dominio a queries del proveedor con cobertura amplia.
- **Renderer con biblioteca de composables**: layout + heading + paragraph + cta + variantes.
- **Repository/mapper de aggregate root extenso**: repositorio o mapper de un aggregate que agrupa múltiples entidades/kinds (ej. Catalog: products own/barcode/combos + promos + categorías) cuya cobertura completa excede el límite sin ser un god-object.

Si el archivo excede sin caer en una excepción: descomponer en mappers internos, helpers privados, o splitear adapter en sub-adapters por capability.

---

## 16. Cohesión y acoplamiento

> Cohesión alta dentro del capability + acoplamiento bajo entre capabilities son los **objetivos meta** que toda decisión de organización debe servir. Las demás reglas del documento son tácticas para alcanzarlos. Si una regla específica entra en tensión con estos objetivos en un contexto particular, los objetivos meta tienen prioridad (con excepción documentada según §21).

### 16.1. Cohesión alta

**Indicadores:**
- Cada capability se describe en una palabra.
- Adapters dentro del capability cambian por las mismas razones (cambio de proveedor, nueva variante).
- Los archivos del capability colaboran sobre un mismo concepto infraestructural.

**Rechazar:**
- Capability "misceláneo" sin nombre claro.
- Adapters de proveedores distintos en el mismo archivo.

### 16.2. Acoplamiento bajo

**Indicadores:**
- Cada capability soberano (cero imports cross-capability salvo cross-cutting declarado).
- Cada adapter consume solo el contrato del dominio; cero conocimiento de otros adapters.
- Cero ciclos.

### 16.3. Soberanía de capabilities

- Capabilities hermanos no comparten **internals** entre sí (nunca sub-barrels ni archivos privados de otro capability).
- **Colaboración vía barrel**: cuando dos capabilities colaboran (ej. los media-adapters de `storage` consumen el `image-cache` para invalidar en upload/delete), el consumidor importa **solo el barrel público** del productor (`../cache`, nunca `../cache/image`). Es composición local (§3) sobre la API pública, no acoplamiento de internals.
- Cross-cutting declarado en §13 (boot/audit) es la excepción a "no importar en absoluto": se consume incluso desde contextos internos.

---

## 17. Tipado

- Cero `any`, supresiones de tipo, deshabilitación del compilador.
- Type guards en lugar de casts en mappers.
- Discriminated unions para resultados con múltiples formas (resultado de verificación, outcome de pago, estados de procesamiento).
- Generic constraints cuando el adapter retorna tipo parametrizado por consumer.
- DTOs públicos retornados al consumer: campos readonly.

---

## 18. Naturaleza de la capa

La capa de infraestructura **sí toca I/O por diseño**: red, base de datos, almacenamiento, APIs del navegador o del runtime de servidor. Es su razón de existir.

### 18.1. Permitido

- HTTP, WebSocket, file I/O, SDK de proveedores externos.
- APIs del navegador en adapters de cliente (almacenamiento del cliente, image cache).
- APIs del runtime de servidor en adapters de servidor (filesystem, headers, cookies).
- SDK del framework de servidor (cookies HTTP, headers, runtime config).
- Crypto (HMAC, hash, firma) en verificadores.

### 18.2. Prohibido

- Importar la capa de aplicación.
- Importar la capa de vistas.
- Lógica de negocio (va en el dominio).
- Render de UI o componentes.
- Estado mutable de UI o framework reactivo.

Si una operación requiere lógica de negocio: vive en el dominio y el adapter la consume.

Si una operación requiere orquestación de casos de uso: vive en aplicación, no en infraestructura.

---

## 19. Reglas de barrel

### 19.1. Por capability

- Cada capability tiene barrel propio.
- El barrel exporta singletons pre-ensamblados + factories cuando se requiere parametrización runtime.
- No re-exporta puertos privados internos del capability.
- No re-exporta paths internos del capability (subcarpetas son detalles privados).

### 19.2. Barrel principal de la capa

- Re-exporta los singletons pre-ensamblados de cada capability.
- Re-exporta factories declaradas que requieren configuración del consumer.
- No re-exporta tipos privados internos.
- No re-exporta nombres específicos del proveedor (los singletons usan nombres semánticos del capability).

### 19.3. Reglas de consumo externo

- El consumer externo (la capa que cablea infraestructura con dominio) consume exclusivamente el barrel principal.
- No consume paths internos de capabilities.
- No instancia adapters directamente (recibe singletons o factories).

---

## 20. Anti-patrones (índice)

| Anti-patrón | Sección | Excepción §21 |
|---|---|---|
| Adapter importa la capa de aplicación | §2 | inviolable |
| Adapter importa la capa de vistas | §2 | inviolable |
| Adapter NO implementa un contrato del dominio | §6 | — |
| Adapter expone tipos del proveedor en su API pública | §6 | — |
| Error nativo del proveedor escapa sin traducir | §8 | — |
| Adapter accede directamente a variables de entorno globales | §11 | — |
| Imports cruzados entre capabilities sin cross-cutting declarado | §4 | — |
| Cross-cutting que importa otro capability de infraestructura (no acíclico) | §13 | — |
| Adapter con clase y estado mutable | §6 | — |
| Singleton inicializado fuera del barrel del capability | §3 | — |
| Lógica de negocio dentro del adapter | §1 | — |
| Mappers que usan casts en lugar de type guards | §14 | — |
| Puerto privado de infraestructura colocado en el dominio | §9 | — |
| Validación de configuración dispersa en adapters individuales | §11 | — |
| Adapter sin mapper de errores específico del proveedor | §8 | — |
| Multi-provider sin registry+selector+factory | §10 | §21.2 (un único proveedor activo) |
| Idempotency key omitida en operación que el proveedor soporta | §12 | §21.2, §21.4 (proveedor o SDK garantiza) |
| Timeout omitido en llamada HTTP externa | §12 | §21.3, §21.4 (operación interna o SDK lo maneja) |
| Selector que retorna el adapter concreto del proveedor | §10 | — |
| Capability "misceláneo" sin nombre claro | §4 | — |
| Subcarpeta `helpers/`, `utils/`, `lib/` | §5.4 | — |
| Conversión de DTO externo con default silencioso sin documentar | §14 | — |
| Re-export de paths internos del capability en el barrel | §19.1 | — |
| Adapter usa singleton del proveedor sin envolverlo en factory | §6.2 | — |
| `any`, supresiones de tipo | §17 | inviolable |

---

## 21. Excepciones legítimas por contexto

Toda excepción debe ser documentada inline en el código con la categoría correspondiente.

| # | Categoría | Caso típico | Documentar como |
|---|---|---|---|
| 21.1 | **VARIANT** — variante de capability | Selector por país/contexto, adapter manual interno, configuración distinta del mismo proveedor | `// VARIANT: <razón>` |
| 21.2 | **COST** — optimización de rentabilidad | Multi-provider sin registry cuando hay un solo proveedor; idempotency omitida si proveedor garantiza; validación omitida si SDK ya valida; cache de proceso con TTL | `// COST: <decisión y trade-off>` |
| 21.3 | **OPS** — protección de la operación | Silent fail en operación no crítica; fallback graceful cuando proveedor no soporta capacidad; timeout omitido en operación local del runtime | `// OPS: <razón>` |
| 21.4 | **STRUCT** — estructura previa garantiza invariante | Validación que el SDK ya hizo; sanitización que upstream ya hizo; idempotencia que SDK maneja internamente | `// STRUCT: <qué upstream garantiza>` |

### 21.5. Reglas que admiten excepciones

| Regla | Categorías aplicables |
|---|---|
| §10 Multi-provider obligatorio | §21.2 |
| §12 Idempotency key | §21.2, §21.4 |
| §12 Timeout en HTTP | §21.3, §21.4 |
| §8 Error map exhaustivo | §21.4 |
| §11 Validación de config eager | §21.2 |

### 21.6. Reglas SIN excepciones (inviolables)

Estas reglas protegen la integridad fundamental de la capa. No admiten excepciones por costo, operación o variante. Romperlas no es excepción documentable: es deuda técnica que requiere refactor.

- §2 Direcciones de dependencia: nunca importar `application/` ni `views/`.
- §6 Adapter implementa un contrato del dominio (sin contrato declarado en el dominio, no es adapter).
- §13 Cross-cutting modules acíclicos.
- §17 Cero `any`, supresiones de tipo, deshabilitación del compilador.
- §18 Cero render de UI ni estado de framework reactivo en adapters.

---

## 22. Checklist pre-merge para nuevo adapter

- [ ] Capability nombrado en una palabra; adapter implementa un contrato del dominio.
- [ ] Factory function (`createXxxAdapter`); tipos del proveedor encapsulados (cero leak en API pública).
- [ ] Mapper de errores específico (`mapXxxError`) que traduce al catálogo del dominio.
- [ ] Mappers de tipos (`toDomainType`) con type guards; cero casts directos; cero `any`.
- [ ] Configuración via parámetros del factory; cero acceso global a env.
- [ ] Singleton ensamblado en barrel del capability; barrel principal re-exporta.
- [ ] Multi-provider: registry + selector + factory, **o §21.2 documentada**.
- [ ] HTTP externas con timeout, **o §21.3 / §21.4 documentada**.
- [ ] Idempotency key cuando aplica, **o §21.2 / §21.4 documentada**.
- [ ] Audit logs con namespace `infra.<capability>.<event>`.
- [ ] Puertos privados internos en `<capability>/ports/` (NO en dominio).
- [ ] Tamaños dentro de límites (o §15.1 documentada).
- [ ] Cohesión: capability describible en una palabra.
- [ ] Acoplamiento: cero imports cross-capability sin cross-cutting declarado en §13.
- [ ] Cualquier anti-patrón de §20 presente tiene excepción §21 documentada inline (cuando la regla admite excepción).
- [ ] Reglas inviolables (§21.6) cumplidas sin excepción.
- [ ] Compilador de tipos pasa sin errores; linter pasa.
