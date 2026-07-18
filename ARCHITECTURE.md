# Arquitectura

`engine-table-management` — base para un motor de gestión de mesas, sobre **Next.js 16** (App Router) + **React 19** + **Tailwind v4**.

Sigue **Clean / Hexagonal Architecture**: 5 capas soberanas bajo `src/`, cada una con su documento normativo `_*-LAYER.md`. El alias de imports es `@/*` → `./src/*`.

> **Estado**: base **sin lógica de negocio real** (sin Firebase, sin datos). El andamiaje arquitectónico y el kit de UI están completos; la lógica del motor se construye encima.

---

## Las 5 capas

```
src/
├── domain/           Núcleo puro: entidades, value objects, reglas puras, puertos, errores.
│                     No conoce a NADIE. Cero I/O, cero React, cero side effects.
├── application/      Casos de uso: orquesta el dominio sobre puertos. Composition root.
├── infrastructure/   Adapters de I/O: implementa los puertos del dominio (auth, db, storage…).
├── views/            Presentación: React, hooks, componentes, UI/UX. Consume application+domain.
└── utils/            Librería de helpers agnósticos al negocio. Cualquier capa la usa.
```

### Dirección de dependencias (la regla de oro)

```
views ──▶ application ──▶ domain ◀── infrastructure
  │            │             ▲              │
  └────────────┴─────────────┴──────────────┘
                    todos ──▶ utils

domain ──▶ (nada)          Las flechas apuntan HACIA el dominio; el dominio no apunta a nadie.
```

- **domain** no importa de ninguna otra capa (verificado: 0 imports).
- **views** nunca importa de `infrastructure` (solo de `application`, `domain`, `utils`).
- **infrastructure** implementa contratos del dominio; nunca conoce `application` ni `views`.
- **utils** es agnóstico: cero conocimiento del negocio, cero imports de capas de la app.

Cada capa detalla sus reglas en su LAYER.md:
[domain](src/domain/_DOMAIN-LAYER.md) · [application](src/application/_APPLICATION-LAYER.md) · [infrastructure](src/infrastructure/_INFRAESTRUCTURE-LAYER.md) · [views](src/views/_VIEW-LAYER.md) · [utils](src/utils/_UTILS-LAYER.md)

---

## Aclaraciones (los puntos que suelen confundir)

**1. Hay DOS carpetas `utils/` — a propósito:**
- `src/utils/` → helpers **100% agnósticos** (se copiarían a otro proyecto sin cambios): `cn`, `format-price`, `decimal-input`, `normalize-text`, `crop-image`, `icon-catalog`.
- `src/views/admin/utils/` → helpers **específicos del frontier admin**: `logger`, `cache`, `blob-to-data-url`, `stable-hash`.
- **Regla**: si menciona conceptos del negocio o del admin → va en el segundo; si es universal → va en `src/utils/`.

**2. `application/` e `infrastructure/` están casi vacías — a propósito:**
Son el andamiaje de la base. `application/index.ts` es el **composition root** (único punto autorizado a importar de infraestructura). Las carpetas de `infrastructure/` (`auth`, `database`, `storage`, `cache`, `boot`) son capabilities vacías listas para cablear. Se llenan cuando exista lógica real.

**3. `domain/` solo tiene el módulo `schedule`:**
Es un modelo de horarios puro (`weeklyHoursEnvelope`, etc.) que consumen los widgets `ScheduleEditor`/`DayTimeline`. Vive en el dominio porque es lógica pura de negocio (VIEW-LAYER §11.1: la vista no contiene reglas de negocio). Es el primer y único módulo de dominio hasta ahora.

---

## Capa de vistas (`views/`)

Organizada por **fronteras soberanas** (no comparten código entre sí):

```
views/
├── admin/            Frontier administrativo (el desarrollado): SPA con shell + kit completo.
│   ├── components/    Kit reutilizable: primitives (43) + overlays/modals (3) + graphics + StatCard.
│   ├── screens/       Pantallas: Dashboard, Mesas, Reservas, Configuración, Componentes (showcase).
│   ├── shell/         Layout: DesktopSidebar (colapsable) + MobileNav + ThemeToggle.
│   ├── router/        Router SPA client-side (ver abajo).
│   ├── providers/     ThemeProvider (claro/oscuro/sistema) + Toast.
│   ├── hooks/         useIsMobile, useModalState, useAutoSave, useImage…
│   ├── config/        routes, storage-keys.
│   └── utils/         Helpers específicos del admin.
└── system/            Páginas de sistema neutrales: ErrorPage, NotFoundPage.
```

### Ruteo: SPA con catch-all (no ruta-archivo por pantalla)

El admin es una **Single Page Application**. Todas las URLs `/admin/*` entran por **una sola ruta catch-all** `app/(admin)/admin/[[...path]]/page.tsx` (que solo evita el 404). El render real lo decide **`AdminRouter`** en cliente según `currentPath` del `AdminNavProvider`:

```
app/(admin)/layout.tsx  →  AdminNavProvider  →  AdminShell  →  AdminRouter  →  <Screen/>
```

Navegar entre secciones = `history.pushState` + swap de componente (**instantáneo, sin round-trip al server**). Las URLs siguen siendo reales y deep-linkables (SSR resuelve la pantalla al cargar directo). Para agregar una pantalla: crear el `Screen`, registrarlo en `router/AdminRouter.tsx` (`SCREEN_MAP`), añadir la ruta en `config/routes.ts`, el ítem en `shell/nav-items.ts` y la ruta al `SPA_ROUTES` de `AdminNavProvider`.

### Tema

`ThemeProvider` maneja `light | dark | system` con estrategia **`.dark` por clase** en Tailwind v4, persistido en `localStorage`, con **script no-flash** inyectado en `<head>` (aplica la clase antes del primer paint).

---

## ¿Dónde pongo código nuevo?

| Quiero… | Va en |
|---|---|
| Una entidad / regla de negocio pura | `domain/entities/<contexto>/` |
| Un contrato para I/O (persistencia, auth, email) | `domain/repositories/` o `domain/ports/` |
| Un caso de uso (orquestar dominio + infra) | `application/<feature>/` |
| Un adapter concreto (Firestore, Resend…) | `infrastructure/<capability>/` |
| Una pantalla o componente de UI | `views/admin/screens/` o `views/admin/components/` |
| Un helper universal (sin negocio) | `src/utils/` |
| Un helper del admin (con logger/cache…) | `views/admin/utils/` |

---

## Comandos

```bash
npm run dev      # dev server (http://localhost:4000 → redirige a /admin)
npm run build    # build de producción
npm run lint     # eslint
npx tsc --noEmit # typecheck
npm audit        # vulnerabilidades
```

---

## Verificación de conformidad

La base pasa: `tsc` (0 errores) · `eslint` (0 errores) · `next build` · `npm audit` (0 vulnerabilidades). Las reglas inviolables de cada LAYER.md están cumplidas (direcciones de dependencia, cero `any`, dominio puro). Los warnings de lint restantes son patrones deliberados de React Compiler heredados verbatim del proyecto de referencia (`digital-presence-for-clients-b01`), no deuda propia.
