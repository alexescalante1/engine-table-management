# engine-table-management

Base para un **motor de gestión de mesas**, construida sobre **Next.js 16** (App Router) + **React 19** + **Tailwind v4**, con **Clean / Hexagonal Architecture**.

Es una base **sin lógica de negocio real** (sin Firebase, sin datos): el andamiaje de las 5 capas y el kit de UI/UX del panel admin están completos y listos para construir encima.

## Inicio rápido

```bash
npm install
npm run dev
```

Abre [http://localhost:4000](http://localhost:4000) — redirige a `/admin` (el panel navegable).

## Qué hay dentro

- **Panel admin navegable** (SPA): Dashboard, Mesas, Reservas, Configuración y una pantalla **Componentes** que muestra el kit en vivo.
- **Kit de UI reutilizable**: 43 primitives + 3 modals/overlays + graphics, con tema claro/oscuro/sistema, responsive desktop/mobile y navegación SPA instantánea.
- **5 capas** con reglas normativas documentadas (`_*-LAYER.md`).

## Arquitectura

Lee **[ARCHITECTURE.md](ARCHITECTURE.md)** para el mapa completo: las 5 capas, direcciones de dependencia, dónde poner código nuevo, el ruteo SPA y el sistema de tema.

Referencia profunda por capa:
[domain](src/domain/_DOMAIN-LAYER.md) · [application](src/application/_APPLICATION-LAYER.md) · [infrastructure](src/infrastructure/_INFRAESTRUCTURE-LAYER.md) · [views](src/views/_VIEW-LAYER.md) · [utils](src/utils/_UTILS-LAYER.md)

## Comandos

```bash
npm run dev        # dev server
npm run build      # build de producción
npm run lint       # eslint
npx tsc --noEmit   # typecheck
```

## Nota sobre Next.js 16

Esta versión tiene breaking changes respecto a versiones anteriores. Antes de escribir código, consulta las guías en `node_modules/next/dist/docs/` (ver [AGENTS.md](AGENTS.md)).
