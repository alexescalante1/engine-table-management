import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Reglas de React Compiler (react-hooks v6, traídas como `error` por
    // eslint-config-next 16). `set-state-in-effect` y `refs` marcan patrones
    // DELIBERADOS y correctos del proyecto para los que no existe alternativa
    // limpia: timers/intervals (countdown de auto-guardado, delayed-loading),
    // hidratación de tema desde localStorage (SSR-safe, no puede ser lazy init),
    // sincronización con el router SPA, y el patrón canónico de "latest-value
    // ref" (`ref.current = value` en render). No son bugs y no bloquean
    // `next build`; se apagan para mantener el lint 100% limpio. `purity` y
    // `preserve-manual-memoization` se conservan como `warn` (sí atrapan errores
    // reales y hoy no reportan nada).
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
