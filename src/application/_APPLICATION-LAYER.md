# Arquitectura de la capa de Aplicación

Reglas normativas para `application/`. Romper una regla solo si se justifica por una excepción documentada.

> **Norte rector**: orquestar casos de uso sobre puertos del dominio. Implementar nada. Tocar infraestructura solo desde el composition root. Cada feature es soberano.
>
> Las reglas son el ideal. Cada una admite excepciones documentadas (§21) cuando aplicarla rompe el negocio, la rentabilidad o la experiencia del usuario. Una excepción legítima requiere comentario inline que identifique la categoría de la excepción y la justifique. Las reglas inviolables están listadas en §21.6.

---

## 1. Responsabilidades

**SÍ:**
- Orquestar casos de uso (composición de operaciones del dominio y de infraestructura).
- Validar entrada del consumidor antes de delegar.
- Transformar entidades del dominio a DTOs cuando el consumidor necesita una projection, agregado o formato específico.
- Coordinar transacciones atómicas multi-colección.
- Invalidar caches tras mutaciones.
- Emitir audit logs para eventos de negocio observables.

**NO:**
- Implementar reglas de negocio.
- Acceder directamente a I/O (red, base de datos, almacenamiento, APIs del navegador).
- Renderizar, manejar eventos, ni mantener estado de UI.
- Implementar caches, repositorios, ni adapters.
- Conocer detalles del proveedor de un servicio externo (debe depender de puertos del dominio).

Cuando se necesita una operación NO permitida: delegar al dominio (regla pura) o a infraestructura (I/O), nunca implementar aquí.

### 1.1. SOLID en application

| Principio | Manifestación |
|---|---|
| **SRP** | Cada use case orquesta un verbo de negocio; cada service agrupa use cases del mismo bounded context. |
| **OCP** | Cross-feature explícito vía puertos (DIP) permite agregar consumidores/productores sin modificar code existente. |
| **LSP** | Use cases reciben interfaces (puertos del dominio); cualquier adapter compatible es intercambiable. |
| **ISP** | Puertos consumidores son mínimos (la feature consumidor declara solo los métodos que necesita). |
| **DIP** | Application depende de puertos del dominio, nunca de implementaciones de infra (composition root es el único punto de cableado). |

### 1.2. DDD en application

- Use cases preservan **ubiquitous language** del dominio en el naming (verbos del negocio).
- Cada use case opera sobre **aggregate roots** del dominio; las reglas viven en el dominio, application solo orquesta.
- Cross-feature usa **puertos** (interfaces declaradas por la feature consumidor) como **anti-corruption layer** entre bounded contexts.
- DTOs son **projections** del dominio cuando el consumidor necesita formato distinto; no entidades nuevas.

---

## 2. Direcciones de dependencia

```
Aplicación  →  Dominio (entidades, puertos, repositorios, errores)
Aplicación  →  Utilidades agnósticas
Aplicación  →  Ambiente (variables de entorno tipadas)
Aplicación  →  Infraestructura  ← SOLO desde el composition root
Aplicación  →  Vistas             ← PROHIBIDO
```

> **Puerto** = interfaz declarada en el dominio que la infraestructura implementa.

**Prohibido:**
- Cualquier archivo importa de la capa de vistas.
- Cualquier archivo importa código de un framework de UI.
- Módulos hermanos importan código entre sí sin puerto declarado ni utility agnóstica del dominio.

---

## 3. Composition root

Único archivo de la capa autorizado a importar de infraestructura. Ningún otro punto puede instanciar adapters, repositorios, ni gateways.

### 3.1. Reglas

- Importa los singletons de infraestructura y los pasa a las factory functions de cada feature.
- Exporta servicios singleton vía constantes.
- Cuando dos servicios deben colaborar (uno depende del otro): ambos se cablean aquí, en el orden correcto de construcción.
- Agregados que componen múltiples servicios para un consumidor único viven aquí (ver §3.2).

### 3.2. Cuándo crear un aggregate (facade)

- Un consumidor único (frontera externa, panel administrativo, endpoint público) necesita una API plana sobre N servicios cohesivos.
- El aggregate vive solo en el composition root, no en un módulo.
- Documentar el rol como facade con comentario inline.
- No reemplaza a los servicios individuales: estos siguen siendo la unidad de cohesión real.

### 3.3. Anti-patrones

- Importar infraestructura desde un service o use case.
- Instanciar adapters o repositorios fuera del composition root.
- Inicializar singletons fuera del composition root.

---

## 4. Organización por feature (bounded contexts)

Cada carpeta top-level de la capa es un **bounded context soberano**: agrupa todos los casos de uso, DTOs y helpers de un mismo concepto del negocio.

### 4.1. Reglas

- Un módulo describe una sola responsabilidad nombrable en una frase corta.
- Los módulos no comparten código entre sí. Si dos colaboran: puerto declarado o utility agnóstica del dominio.
- Ningún módulo `shared/`, `common/`, `utils/`, `helpers/` que cruce features.
- Si un caso de uso pertenece a dos features: vive en la feature que lo originó; la otra lo consume vía puerto.
- Si una utility cruza dos features y es agnóstica al dominio: vive en la feature que más naturalmente la posee, y la otra la importa por path absoluto.

### 4.2. Cross-feature explícito

Cuando dos features deben colaborar, aplicar inversión de dependencias en tres pasos:

1. La feature **consumidor** declara un puerto: una interfaz mínima con la operación que necesita.
2. La feature **productor** implementa el puerto cumpliendo el contrato.
3. El composition root inyecta el productor donde el consumidor declara la interfaz.

El consumidor no conoce el nombre ni los detalles del productor — solo su contrato. Cambiar la implementación no afecta al consumidor.

---

## 5. Anatomía de un módulo

### 5.1. Estructura

```
<feature>/
├── index.ts                          # Barrel: solo API pública
├── <feature>.service.ts              # Service principal del flujo (cuando aplica)
├── <accion>.usecase.ts               # Casos de uso del flujo principal (cuando aplica)
├── admin/                            # Sub-feature consumida solo por la frontera administrativa
├── emails/                           # Servicios de email del feature
├── internal/                         # Helpers, constants, types y caches PRIVADOS al módulo
├── ports/                            # Interfaces que cruzan features (DIP)
├── lifecycle/                        # Background tasks (jobs programados, cleanup, reconcile)
└── io/                               # Export/import bulk
```

### 5.2. Cuándo crear cada subcarpeta

| Subcarpeta | Crear cuando |
|---|---|
| `admin/` | Hay sub-feature consumida solo por la frontera administrativa (services + DTOs admin-only) |
| `emails/` | El feature envía ≥1 email transaccional |
| `internal/` | Hay helpers, constants, types o caches privados al módulo (≥20L combinados o ≥2 archivos) |
| `ports/` | El feature declara una interfaz que otra feature consume (DIP) |
| `lifecycle/` | El feature tiene tasks programadas o de reconciliación que corren independientes del flujo principal |
| `io/` | El feature soporta export/import bulk de datos |

### 5.3. Top-level del módulo

Reservado para los archivos del flujo principal (ver árbol §5.1). Todo lo demás vive en una subcarpeta de §5.2.

### 5.4. Helpers privados a archivo vs `internal/`

| Alcance del helper | Ubicación |
|---|---|
| Usado por **un único archivo** (1 consumidor) | Función privada en ese archivo, sin exportar |
| Usado por **≥2 archivos del mismo módulo** | `internal/` con barrel propio |
| Usado por **≥2 features** | Subir al dominio o a una utility agnóstica |

### 5.5. Anti-patrones

- Helper privado suelto en top-level cuando el módulo ya tiene `internal/`.
- Email service top-level cuando otros módulos usan `emails/` (inconsistencia entre features hermanas).
- DTO admin-only top-level mezclado con DTOs del flujo principal.
- Subcarpeta `helpers/`, `utils/`, `lib/` (usar `internal/` para preservar uniformidad).
- Subcarpeta con un único archivo cuando el rol no requiere crecimiento previsible (mantener top-level hasta que se justifique la subcarpeta).

---

## 6. Services y Use Cases

### 6.1. Cuándo cada patrón

| Patrón | Cuándo aplicar |
|---|---|
| Service con N métodos | Feature tiene 2-5 casos de uso simples del mismo bounded context, cada uno cabe en pocas líneas dentro del service |
| Un archivo por caso de uso | Caso de uso requiere helpers privados, flujo atómico complejo, o no cabe en un método pequeño dentro del service |
| Service + use cases en el mismo módulo | Feature tiene casos simples más 1-2 complejos. Service para los simples, archivos de use case para los complejos |

### 6.2. Naming de operaciones

Cada operación expuesta es un **verbo de negocio**: la lectura del nombre describe la intención específica del caso de uso.

| Bien | Mal |
|---|---|
| Verbo + sustantivo del dominio que describe el efecto observable | Verbo genérico sin sustantivo del dominio |
| Acción específica con resultado predecible del nombre | Acción ambigua que no revela qué cambia |

### 6.3. Anti-patrones

- Service anémico: un solo método que es passthrough trivial a un repositorio sin agregar valor (validación, transformación, transacción, audit).
- Servicio omnibus: casos de uso de bounded contexts distintos en el mismo archivo.
- Caso de uso público con nombre genérico como verbo principal sin sustantivo del dominio (`process`, `handle`, `manage`, `do`). Excepción §21.1: válido como composición (`processWebhook`, `handlePayment`) o como sustantivo de patrón nombrado (`handler`, `dispatcher`, `processor`) cuando el rol estructural es claro.

---

## 7. Inyección de dependencias

### 7.1. Reglas

- Constructor injection explícito por parámetros. Sin contenedor mágico, sin decoradores, sin reflexión.
- Hasta 5 dependencias: parámetros posicionales nombrados.
- Más de 5 dependencias: agrupar en objeto tipado.
- Cada dependencia es una **interfaz** (puerto del dominio o tipo de service de aplicación), nunca una implementación concreta.
- Composición intra-módulo: el barrel del feature ensambla los use cases con sus dependencias.
- Composición inter-módulo: solo en el composition root.

### 7.2. Patrón funcional

- Factory functions, no clases.
- Sin operador `new`.
- Sin estado mutable a nivel módulo.
- El servicio retornado es un objeto cuyos métodos capturan las dependencias inyectadas en su closure.

### 7.3. Anti-patrones

- Inyectar implementaciones concretas del proveedor en lugar de interfaces.
- Singleton inicializado dentro del módulo en lugar del composition root.
- Acceso a variables de entorno o configuración global desde un service. Deben llegar como parámetro desde el composition root.
- Dependencia circular entre servicios.

---

## 8. Naming

### 8.1. Sufijos de archivo

| Sufijo | Rol |
|---|---|
| `.service.ts` | Agrupa casos de uso del mismo bounded context |
| `.usecase.ts` | Un caso de uso (un verbo de negocio) cuando justifica archivo propio |
| `.model.ts` | DTOs del feature cuando agregan datos sobre entidades del dominio |
| `.dto.ts` | Projection de UNA entidad del dominio a un DTO de consumo (ej. `Product`, `Combo`) |
| `.view.ts` | Read-model AGREGADO multi-entidad de consumo (ej. `CatalogView` = products+categories+combos) |
| `.port.ts` | Interfaz declarada por el feature consumidor para cruzar features |

`.dto.ts`/`.view.ts` son la taxonomía fina del DTO (projection de entidad vs read-model agregado); `.model.ts` es válido para DTOs simples. `.projections.ts` (plural) = utilities de transformación puras que producen esos DTOs.

Sin sufijo (excepción): utilities puras agnósticas, constants públicos consumidos desde fuera del módulo.

### 8.2. Identificadores

| Tipo | Convención |
|---|---|
| Factory de service | Verbo `create` + nombre del service |
| Factory de use case | Verbo `make` + nombre del use case |
| Métodos públicos | camelCase, verbo de negocio |
| Tipos y interfaces | PascalCase |
| Puertos (interfaces de port) | Prefijo `I` + PascalCase |
| Constants module-level | UPPER_SNAKE_CASE |
| Variables internas | camelCase |

### 8.3. Carpetas

kebab-case. Subcarpetas reservadas con semántica fija definida en §5: `admin/`, `emails/`, `internal/`, `ports/`, `lifecycle/`, `io/`.

---

## 9. DTOs y tipos

### 9.1. Reglas

- Reusar tipos del dominio siempre que sea posible. No re-declarar.
- Crear DTO propio **solo cuando agrega datos** sobre la entidad de dominio: projection extendida, agregado de fuentes cruzadas, formato específico para el consumidor.
- DTOs viven en archivos `.model.ts` colocalizados con el service que los produce.
- DTOs públicos consumidos por la capa de vistas: re-exportar desde el barrel principal de la capa de aplicación.
- Marcar DTO público como readonly en cada campo.

### 9.2. Anti-patrones

- DTO que duplica una entidad del dominio sin agregar datos.
- DTO mutable.
- DTO con métodos (es entidad, no DTO — pertenece al dominio).
- Exportar DTO desde el módulo si ningún consumer externo lo usa.

---

## 10. Manejo de errores

Existen **dos categorías** de errores con tratamientos distintos. Confundirlas erosiona la experiencia del usuario o pierde información técnica útil para debug.

### 10.1. Errores expuestos al usuario

Validaciones de input, race conditions visibles, reglas de negocio que el usuario debe entender y corregir.

- Lanzar con el factory de errores del dominio.
- Pasar un código del catálogo del dominio y un mensaje accionable.
- Si no existe el código que describe el error: agregarlo al catálogo del dominio. No usar genérico.
- El consumer externo (frontera) usa el código para internacionalizar o mapear a UI.

### 10.2. Invariantes internas / fail-fast defensivo

Estados que no deberían ocurrir si el código es correcto: contratos rotos entre módulos, datos inconsistentes detectados en runtime, configuración faltante, valores fuera de rango imposibles tras validación previa.

- Lanzar error genérico del lenguaje con mensaje técnico descriptivo.
- El mensaje debe identificar el invariante violado y los valores observados.
- No se exponen al usuario; sirven para fail-fast en desarrollo y observabilidad en producción (capturados por audit logging cuando aplique).
- No requieren código del catálogo (no son errores categorizables del negocio — son bugs).

### 10.3. Capturas permitidas

- **Best-effort cleanup** (`try/catch`): storage, side effects no críticos. Loggear, no re-lanzar.
- **Side-effect post-éxito** (`try/catch`): email transaccional, audit log. Fallo no debe abortar el flujo principal.
- **Operación idempotente o garantizada por estructura previa** (`try/catch` con comentario): cuando el error indica un caso esperado y la operación tolera ambos resultados (crear-si-no-existe, eliminar-si-existe), o cuando el flujo upstream garantiza que solo el caso esperado puede llegar (validación previa, permisos verificados en frontera). Comentario inline justifica la categoría §21.3 (UX) o §21.4 (estructura previa).
- **Liberación de lock** (`try/finally`): claim de un slot temporal que debe liberarse pase lo que pase, sin capturar el error.

### 10.4. Anti-patrones

- Lanzar error técnico defensivo para un caso que el usuario debería corregir (pierde UX).
- Lanzar error con código del catálogo para un invariante interno (pierde el mensaje técnico, sugiere falsamente que es un caso de negocio).
- `try/catch` que silencia el error sin loggear ni comentario justificador (§21.3 o §21.4 con comentario inline lo convierte en captura permitida).
- Validar invariantes del dominio dentro del service (debe ir en entidad del dominio).
- Catchear errores de validación para devolver valor nulo o por defecto (rompe el contrato — propagar).

---

## 11. Transacciones atómicas

### 11.1. Dos primitivas distintas

El puerto de unidad de trabajo expone **dos primitivas** con propósitos distintos. Elegir según el caso.

| Primitiva | Tipo de callback | Cuándo usar |
|---|---|---|
| **Batch** | Síncrono, writes-only | Mutaciones múltiples que NO requieren leer estado dentro del contexto. La decisión de qué mutar ya se tomó antes |
| **Transaction** | Asíncrono, reads + writes | Hay que leer dentro del contexto atómico antes de mutar (race re-check, lectura del estado actual para decidir la mutación) |

### 11.2. Reglas

- Mutaciones que afectan ≥2 colecciones y deben ser atómicas: vivir dentro del callback transaccional.
- El contexto transaccional se pasa explícitamente entre helpers que mutan.
- Helpers transaccionales: nombrar con sufijo que indique que el helper opera dentro de una transacción (por ejemplo, sufijo `InTx`), aplicado de forma consistente en el módulo.
- **Reads dentro del callback son transaccionales** (parte del UoW) — válidos cuando se usan para race re-check o decisiones atómicas.
- I/O **no transaccional** (llamadas a gateways externos, emails, audit, fetch HTTP) NUNCA dentro del callback. Hacer la llamada antes; mutar dentro; emitir efectos después.

### 11.3. Anti-patrones

- I/O no transaccional (HTTP, gateway externo, email) dentro del callback (rompe atomicidad).
- Usar `transaction` cuando solo hay writes (preferir `batch` por simplicidad).
- Usar `batch` cuando hay que leer dentro del contexto (no soporta reads — usar `transaction`).
- Mezclar mutaciones transaccionales y no-transaccionales en el mismo método sin separación clara.
- Iniciar transacciones desde fuera de la capa de aplicación.

---

## 12. Patrones operativos

Patrones que aplican a casos de uso con flujos distribuidos, concurrencia, side effects externos o requisitos de testabilidad. No son obligatorios en todos los casos de uso. Cuando el caso aplica, el patrón es obligatorio.

### 12.1. Idempotencia

Capacidad del caso de uso de procesar el mismo evento N veces con efecto idéntico al de procesarlo una sola vez.

**Obligatoria cuando:**
- El caso de uso se invoca desde un proveedor externo que reintenta automáticamente (webhooks, callbacks, mensajes de cola, jobs programados).
- La operación tiene side effects no idempotentes por naturaleza (cobros, emails, notificaciones, mutaciones que cambian totales).

**Cómo implementar:**
- Identificador único del evento provisto por el origen o derivado de campos estables del payload.
- Antes de ejecutar efectos: verificar si el evento ya está en estado terminal (éxito o fallo registrado).
- Si ya está procesado: retornar el resultado previo sin re-ejecutar efectos.
- Si está en progreso: rechazar o esperar; nunca re-ejecutar.
- Audit log con nivel advertencia cuando se detecta duplicado.

**Anti-patrones:**
- Webhook handler sin verificación previa de idempotencia.
- Re-ejecutar side effects (email, audit, mutación) tras detectar duplicado.
- Idempotencia basada en timestamp en lugar de identificador estable.

**Excepción §21.2 (costo) — recuperación por cron en lugar de marker**: si el costo de implementar marker idempotente es alto y existe un cron de reconciliación que recupera estados inconsistentes en su próximo ciclo, es aceptable depender de la reconciliación. Trade-off: ventana de exposición = intervalo del cron. Documentar el cron como mecanismo de recuperación en el código.

### 12.2. Compensación

Operación inversa al claim que restaura el estado previo cuando un flujo distribuido falla entre pasos.

**Obligatoria cuando:**
- El flujo tiene la forma: claim local atómico → llamada externa → consolidación local.
- El claim deja estado intermedio que no debe persistir si la llamada externa falla.
- El proveedor externo no soporta rollback de su parte.

**Cómo implementar:**
- Declarar explícitamente la operación inversa al claim como helper transaccional.
- Invocarla en el bloque que captura el fallo del I/O.
- La compensación debe ser idempotente y tolerar estados intermedios (no asumir que el estado dejado por el claim sigue intacto).
- Audit log con nivel advertencia por cada compensación ejecutada.

**Anti-patrones:**
- Flujo claim + I/O sin operación de compensación declarada.
- Ignorar el fallo del I/O y dejar el claim huérfano.
- Compensación que asume un estado específico en lugar de ser tolerante.

### 12.3. Race re-check

Verificar el invariante dentro de la transacción atómica antes de mutar, para evitar inconsistencias por requests concurrentes sobre el mismo recurso.

**Obligatoria cuando:**
- La mutación depende del estado actual leído antes de la transacción.
- Hay requests concurrentes posibles sobre el mismo recurso (doble-click del usuario, reintentos del cliente, multi-tab, jobs paralelos).
- El invariante puede cambiar entre el read inicial y la mutación.

**Cómo implementar:**
- Leer el estado dentro del callback transaccional (no solo antes).
- Validar el invariante con el estado releído.
- Si el invariante ya no se cumple: lanzar como error de usuario (§10.1) si es race visible, o abortar silenciosamente cuando el caso lo permite.
- Mutar solo si el invariante se preserva en el read transaccional.

**Anti-patrones:**
- Leer estado fuera de la transacción y mutar dentro sin re-leer.
- Asumir que el read inicial sigue siendo válido al momento de mutar.
- Manejar concurrencia con locks de proceso para datos compartidos entre instancias del runtime (los locks de proceso solo protegen una instancia).

### 12.4. Inyección de tiempo

El tiempo es una dependencia inyectada, no obtenida globalmente.

**Obligatoria cuando:**
- El caso de uso registra timestamps, calcula expiraciones, decide ventanas temporales.
- El caso de uso compara fechas relativas al instante actual.
- El comportamiento del caso de uso debe ser testeable determinísticamente.

**Cómo implementar:**
- Declarar puerto de tiempo en el dominio (interfaz con operación que retorna el instante actual).
- Inyectarlo como dependencia al service o use case.
- Consumir el puerto en lugar de la API global de tiempo del lenguaje.

**Anti-patrones:**
- Obtener el tiempo de la API global del lenguaje en lógica de caso de uso (rompe testabilidad determinística).
- Importar utility global de tiempo (acoplamiento implícito a una fuente no inyectable).
- Propagar timestamp como parámetro a través de múltiples capas en lugar de inyectar el puerto de tiempo una vez en el service.

**Excepción §21.2 (costo)**: si el proyecto no tiene testing determinístico activo, la inyección de tiempo es overhead sin beneficio inmediato. Es aceptable usar la API global del lenguaje hasta que se introduzca testing. Documentar la decisión a nivel de proyecto, no en cada use case.

---

## 13. Cache

### 13.1. Reglas

- La capa **invalida** caches tras mutaciones. No las **implementa** (eso vive en infraestructura).
- Tras mutación: el service que mutó invalida los keys afectados antes de retornar.
- Cache de proceso (mapa en memoria del runtime de servidor): aceptable cuando el dato cambia raramente y el cálculo es costoso. Documentar la regla de invalidación.
- Cache de cliente: vía puerto de cache declarado en el dominio.

### 13.2. Anti-patrones

- Implementar cache desde cero en un service (debe ser un puerto en el dominio con implementación en infraestructura).
- No invalidar tras mutación (datos obsoletos visibles para usuarios).
- Mutar y luego retornar dato del cache viejo en la misma llamada.

---

## 14. Logging y observabilidad

Existen **dos tipos** de logging con propósitos distintos. No confundirlos.

### 14.1. Audit logging (eventos de negocio)

Para eventos de **negocio** observables que requieren trazabilidad o intervención humana posterior.

**Cuándo emitir:**

| Nivel | Criterio |
|---|---|
| Informativo | Decisión de negocio que conviene tracear (override administrativo, intervención manual sobre estado del usuario) |
| Advertencia | Validación que falla pero el flujo continúa con compensación (race resuelta, inconsistencia recuperable detectada y mitigada) |
| Crítico | Inconsistencia grave que requiere intervención humana (operación financiera con desajuste, evento duplicado tras éxito previo) |

**Reglas:**
- Usar el puerto de audit logging del dominio.
- Nombrar el evento con namespace estructurado: `<feature>.<event_name>` (categoría legible y agrupable).
- Incluir contexto suficiente para reconstruir el evento: identificadores de los recursos involucrados, valores esperado vs observado, timestamp.
- No exponer secrets ni datos sensibles innecesarios.
- El audit log no debe abortar el flujo principal.

**Excepción §21.2 (costo) — sampling**: para eventos de alto volumen y bajo valor individual (cada checkout exitoso, cada login), aceptable loggear solo una muestra o solo en error. Documentar la política de sampling a nivel de proyecto.

### 14.2. Logging técnico (errores operativos)

Para fallos en operaciones best-effort y side-effects post-éxito que no afectan el resultado del flujo principal pero conviene observar.

**Cuándo emitir:**
- Side-effect post-éxito que falla (email no entregado tras una operación que sí completó, audit log que falla).
- Best-effort cleanup que falla (eliminación opcional de recursos huérfanos).
- Llamadas a servicios externos no críticos que fallan.

**Reglas:**
- Usar el logger técnico del runtime con prefijo de feature: `[<feature>] mensaje técnico`.
- Nivel apropiado al impacto: `warn` para fallos esperables, `error` para fallos no esperables que no abortan el flujo.
- Incluir el error original como segundo argumento.
- No usar para eventos de negocio (esos van a audit logging).

---

## 15. Tamaños

| Tipo | Límite |
|---|---|
| Service | 200L |
| Use case | 250L |
| Helper interno | 100L |
| Model (archivo de DTOs) | 80L |
| Port (archivo de interfaz) | 30L |

### 15.1. Excepciones legítimas de tamaño

Estas excepciones aplican solo a los límites de líneas. Para excepciones de regla por contexto (negocio, costo, UX, estructura), ver §21.

- **CRUD multi-aspect**: service que orquesta crear + leer + actualizar + eliminar + validación + control de presupuesto + reindex sobre el mismo bounded context, donde descomponer fragmentaría artificialmente la responsabilidad.
- **Flujo atómico complejo**: use case con orden estricto de operaciones (preparación + claim de recurso + llamada externa + persistencia + efectos), donde descomponer rompería la legibilidad del orden.
- **Webhook handler**: validación + dispatch por tipo de evento + activación atómica + audit en un único punto de entrada cuyo flujo lineal es la documentación misma del contrato externo.
- **Bulk I/O handler**: service de import/export que orquesta parsing + validación masiva + persistencia bulk en un único punto coherente. Descomponer fragmentaría el contrato del formato externo.

Si el archivo excede sin caer en una excepción: descomponer en helpers internos o dividir casos de uso en archivos propios.

---

## 16. Cohesión y acoplamiento

### 16.1. Cohesión alta

**Indicadores:**
- El módulo se describe en una frase corta sin conjunciones.
- Cambios afectan solo a archivos del módulo.
- Use cases dentro del mismo bounded context cambian por las mismas razones.

**Rechazar:**
- Service que mezcla casos de uso de bounded contexts distintos.
- Service con métodos cuyos cambios no se correlacionan.

### 16.2. Acoplamiento bajo

**Indicadores:**
- Cada módulo expone solo lo necesario en su barrel.
- Todas las dependencias externas son hacia interfaces (puertos del dominio o tipos de servicios), nunca hacia implementaciones concretas.
- Cero ciclos.
- Cero imports cross-module sin puerto o utility justificado.

### 16.3. Soberanía de features

- Features hermanas no comparten código entre sí.
- Si dos features colaboran: puerto en el consumidor, implementación en el productor, cableado en el composition root.
- Duplicación entre features es deseable cuando el cambio futuro es independiente.

---

## 17. Tipado

- Cero `any`, supresiones de tipo, deshabilitación de reglas del compilador sin justificación documentada.
- DTOs públicos: campos readonly.
- Discriminated unions para resultados con múltiples formas (resultado de webhook, outcome de operación financiera, estados de procesamiento).
- Type guards en lugar de casts.
- Generic constraints cuando un use case preserva el tipo del consumer.

---

## 18. Pureza de la capa

La capa de aplicación es **pura lógica de orquestación**. No es código de navegador ni código de framework de UI o servidor.

**Prohibido en cualquier archivo:**
- Importar el framework de UI (componentes, hooks, types de UI).
- Hooks reactivos.
- JSX.
- Directivas de framework de servidor/cliente.
- Acceso a APIs del navegador (objeto window, DOM, almacenamiento del cliente, fetch, request, response).
- Acceso al filesystem.
- Imports del framework de servidor excepto types abstractos vía puerto.

Si una operación requiere API del navegador o lifecycle de UI: vive en la capa de vistas y consume aplicación vía servicio.

Si una operación requiere I/O del servidor: vive en infraestructura y se expone como puerto en el dominio.

---

## 19. Reglas de barrel

### 19.1. Por módulo

- Cada módulo top-level tiene barrel propio.
- El barrel exporta solo la API pública: factory function del service principal + tipos públicos.
- No re-exporta archivos de subcarpetas privadas.
- Subcarpetas con API propia (`admin/`, `emails/`, `lifecycle/`, etc.) tienen sus propios barrels y se consumen desde el composition root por path explícito.

### 19.2. Barrel principal de la capa

- Re-exporta los servicios cableados del composition root.
- Re-exporta DTOs públicos consumidos por la capa de vistas.
- No re-exporta paths internos de módulos.

### 19.3. Reglas de consumo externo

- La capa de vistas consume exclusivamente el barrel principal.
- No consume paths internos de módulos salvo excepción documentada y justificada (constants públicos consumidos por múltiples consumidores externos, donde el símbolo es trivialmente público y el re-export añadiría indirección sin beneficio).

---

## 20. Anti-patrones (índice)

| Anti-patrón | Sección | Excepción §21 |
|---|---|---|
| Service o use case importa la capa de vistas | §2 | inviolable |
| Service o use case importa infraestructura fuera del composition root | §2 | inviolable |
| Imports de framework UI, hooks reactivos, JSX, directivas de servidor/cliente | §18 | inviolable |
| Acceso a APIs del navegador desde la capa | §18 | inviolable |
| Use case con regla de negocio que pertenece al dominio | §1 | — |
| Service anémico (passthrough trivial a repositorio) | §6.3 | — |
| Error técnico defensivo lanzado para un caso que el usuario debería corregir | §10.4 | — |
| Error con código del catálogo lanzado para un invariante interno | §10.4 | — |
| `try/catch` que silencia errores sin loggear ni comentario justificador | §10.4 | §21.3, §21.4 (con comentario) |
| Singleton inicializado fuera del composition root | §3.3 | — |
| Inyección de implementación concreta del proveedor en lugar de interfaz | §7.3 | — |
| Imports cruzados entre features sin puerto declarado | §4.1 | — |
| DTO duplicado de entidad del dominio sin agregar datos | §9.2 | — |
| Carpeta `shared/`, `common/`, `utils/`, `helpers/`, `lib/` entre features | §4.1 | — |
| Helper privado suelto top-level del módulo cuando ya existe `internal/` | §5.5 | — |
| Helper exportado consumido por un solo otro archivo (debería ser inline o `internal/`) | §5.4 | — |
| Email service top-level cuando otros módulos usan subcarpeta `emails/` | §5.5 | — |
| Caso de uso administrativo mezclado con flujo principal | §5.2 | §21.1 (sub-feature `admin/` con guards distintos) |
| Use case con nombre genérico sin verbo de negocio específico | §6.2 | §21.1 (handler, dispatcher como patrón) |
| I/O no transaccional (HTTP, gateway externo, email) dentro del callback transaccional | §11.3 | inviolable |
| Uso de `transaction` cuando solo hay writes (preferir `batch`) | §11.3 | — |
| Uso de `batch` cuando hay que leer dentro del contexto (no soporta reads) | §11.3 | — |
| Audit log para fallo técnico operativo (debería ser logging técnico) | §14.2 | — |
| Logging técnico para evento de negocio relevante (debería ser audit) | §14.1 | §21.2 (sampling) |
| Mutación sin invalidar cache downstream | §13.2 | §21.2 (TTL), §21.4 (no aplica) |
| Webhook handler sin verificación previa de idempotencia | §12.1 | §21.2 (recuperación por cron) |
| Re-ejecutar side effects tras detectar evento duplicado | §12.1 | — |
| Flujo claim + I/O externo sin operación de compensación declarada | §12.2 | — |
| Mutación basada en estado leído fuera de la transacción sin race re-check | §12.3 | — |
| Tiempo obtenido de la API global del lenguaje en lógica de caso de uso | §12.4 | §21.2 (sin testing activo) |
| `any`, supresiones de tipo | §17 | inviolable |
| Subcarpeta sin barrel cuando expone API | §19.1 | — |
| Re-export de archivos internos en barrel | §19.1 | — |
| Consumer externo importa path interno de un módulo | §19.3 | — |
| Dependencia circular entre módulos o servicios | §7.3 | — |
| Service omnibus con casos de uso de bounded contexts distintos | §6.3 | — |

---

## 21. Excepciones legítimas por contexto

Estas reglas tienen excepciones aceptables cuando aplicarlas dañaría algo más valioso que la consistencia normativa. Toda excepción debe ser documentada inline en el código con la categoría correspondiente.

### 21.1. Decisión de negocio

El código aplica una regla de negocio que el documento clasifica como anti-patrón pero es feature intencional.

| Caso típico | Ejemplo |
|---|---|
| Operación administrativa que viola un guard del flujo del usuario | Función que otorga recurso (trial, extensión, override) sin pasar por el flujo público |
| Verbo genérico aceptado como patrón nombrado | `handler`, `dispatcher`, `processor` cuando el rol estructural es claro |
| Sub-feature expuesta solo a frontera privilegiada | `admin/` con guards distintos al flujo público |

Documentar como: `// FEATURE: <descripción del comportamiento intencional>`

### 21.2. Optimización de costo / rentabilidad

Decisiones de infraestructura que sacrifican alguna garantía teórica por reducir costo operativo.

| Caso típico | Ejemplo |
|---|---|
| Cron schedule menos frecuente | 1×/día en lugar de cada hora; recuperación en próximo ciclo |
| Sin retry automático en jobs | Job runner sin retry; reconciliación posterior |
| Sampling de logs en lugar de logging completo | Logs solo en error o tasa baja en éxito |
| Cache TTL en lugar de invalidación explícita | Datos staleados aceptables si refresh es barato |
| Marker idempotente reemplazado por reconciliación | Cron de reconciliación recupera estados inconsistentes |

Documentar como: `// COST: <decisión de costo y trade-off>`

### 21.3. Experiencia del usuario

Decisiones que sacrifican alguna garantía técnica para no romper la UX.

| Caso típico | Ejemplo |
|---|---|
| Silent catch de operaciones idempotentes esperadas | Crear-si-no-existe, eliminar-si-existe sin re-throw |
| Best-effort post-éxito que no aborta el flujo | Email después de tx commit; fallo solo loggea |
| Fallback silencioso a comportamiento por defecto | Si gateway no soporta feature, fallback sin alertar |

Documentar como: `// UX: <razón por la que el silencio protege la experiencia>`

### 21.4. Estructura previa que garantiza el invariante

El código en el archivo actual NO valida algo porque la cadena de llamadas previa ya lo garantiza. La validación sería redundante.

| Caso típico | Ejemplo |
|---|---|
| Validación de existencia que ya hizo el caller | Caller hizo `findById` no-null; el callee asume no-null |
| Permisos verificados en frontera (API route, middleware) | El service no re-verifica auth; el route ya rechazó al no autorizado |
| Datos garantizados por flujo upstream | Plan ya validado en pre-CLAIM; el use case no re-valida |

Documentar como: `// STRUCT: <qué upstream garantiza el invariante>`

### 21.5. Reglas que admiten excepciones de §21

| Regla | Categorías de excepción aplicables |
|---|---|
| §6.3 Use case con nombre genérico | §21.1 (handler, dispatcher como patrón) |
| §10.3 Capturas permitidas | §21.3 (idempotencia esperada), §21.4 (estructura previa garantiza) |
| §10.4 try/catch silencia error | §21.3 (UX), §21.4 (estructura previa) |
| §12.1 Idempotencia obligatoria | §21.2 (recuperación por cron en lugar de marker) |
| §12.4 Inyección de tiempo | §21.2 (overhead sin beneficio si no hay testing activo) |
| §13.2 Mutación sin invalidar cache | §21.2 (TTL aceptable), §21.4 (cache no aplica al caso) |
| §14.1 Audit log para eventos de negocio | §21.2 (sampling si volumen alto y bajo valor) |

### 21.6. Reglas SIN excepciones (inviolables)

Estas reglas protegen la integridad fundamental de la capa. No admiten excepciones por costo, UX o negocio. Romperlas no es excepción documentable: es deuda técnica que requiere refactor.

- §2 Direcciones de dependencia (la capa nunca importa vistas).
- §3 Composition root como único punto que toca infraestructura.
- §11.3 I/O no transaccional dentro del callback transaccional.
- §17 Cero `any`, supresiones de tipo, deshabilitación del compilador.
- §18 Cero framework de UI, hooks reactivos, JSX, APIs del navegador en application.

---

## 22. Checklist pre-merge para nueva integración

- [ ] Bounded context identificado; top-level solo contiene flujo principal; sub-features en subcarpetas reservadas (§5.2).
- [ ] Use cases nombrados con verbo de negocio específico, **o excepción §21.1 documentada inline**.
- [ ] Factory functions; dependencias inyectadas son interfaces (puertos del dominio).
- [ ] Errores expuestos al usuario con factory del catálogo del dominio; invariantes internas con error técnico defensivo (§10).
- [ ] Primitiva transaccional correcta (batch writes-only / transaction reads+writes); I/O no transaccional fuera del callback.
- [ ] Idempotencia verificada en use cases invocados desde proveedor externo, **o §21.2 documentada**.
- [ ] Flujo claim + I/O externo declara operación de compensación inversa.
- [ ] Mutaciones que dependen de estado releen el invariante dentro de la transacción (race re-check).
- [ ] Tiempo inyectado como puerto, **o §21.2 (sin testing activo) documentada a nivel de proyecto**.
- [ ] Caches downstream invalidados tras mutación, **o TTL/§21.2 documentada**.
- [ ] Audit log con namespace `<feature>.<event>`; logging técnico con prefijo `[<feature>]` (§14).
- [ ] DTOs reusan entidades del dominio; propios solo si agregan datos. Readonly en públicos.
- [ ] Tamaños dentro de límites (o §15.1 documentada).
- [ ] Re-exports al barrel principal solo si la capa de vistas consume el símbolo.
- [ ] Cualquier anti-patrón de §20 con excepción §21 documentada inline; reglas inviolables (§21.6) cumplidas.
- [ ] TSC EXIT 0 + linter pasa.
