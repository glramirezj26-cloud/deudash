# AGENTS.md

## Comandos
- `npm run dev` — dev server (Vite, HMR)
- `npm run build` — verificación completa: `tsc -b && vite build` (no hay tests, ni CI)
- `npm run lint` — oxlint (config en `.oxlintrc.json`)

## Proceso obligatorio antes de analizar y ejecutar cambios
- Todo cambio debe ser **integral**: antes de proponerlo y de ejecutarlo, verificar que no genere problemas nuevos ni futuros.
- Checklist previo a editar:
  1. Trazar todos los usos del código/estilo que se va a tocar (referencias cruzadas, props, clases).
  2. Prever interacciones: orden de cascada CSS y especificidad, media queries, breakpoints mobile-first (768px), re-renders, estados y timers.
  3. Tener presente las reglas de negocio del dominio de este repo antes de modificar cualquier lógica.
  4. Correr `npm run build` y `npm run lint` como verificación final obligatoria tras cada cambio.
- Ejemplo de riesgo real ya vivido: una regla CSS correcta pero ubicada después de otra en cascada la pisa silenciosamente (`.chart-ancho` en `index.css`). El orden y la especificidad importan tanto como la regla en sí.

## Contexto técnico
- Dependencias mínimas: solo `react`, `react-dom` y `recharts`. No hay lib de estado ni de estilos; todo lo demás es código propio.
- `tsc -b` corre estricto: `noUnusedLocals`, `noUnusedParameters` y `erasableSyntaxOnly` (sintaxis no-eraseable como `enum`/`namespace` rompe el build).
- Se importa solo con `type` cuando es tipo de dato (`verbatimModuleSyntax`).

## Dominio — leer antes de tocar
- Semántica invertida respecto de la contabilidad: **crédito = lo que debés (suma a la línea)**, **débito = abono (resta)**. `signo()` en `src/lib/calc.ts` es la única fuente de verdad.
- Modelo: `Entrada { id, nombre, monto, tipo: 'credito'|'debito', mes, anio, visible, color }` (`src/types.ts`). Las fechas son pares (anio, mes 1-12), NO objetos `Date`; ordenar con aritmética `anio*12+mes`.
- Toda la lógica (series, KPIs, formateo `$` es-AR, PALETA) vive en `src/lib/calc.ts`; los componentes solo la consumen.
- Persistencia 100% localStorage (key `deudash.entradas.v1`) en `src/lib/store.ts`, más export/import JSON. Sin backend.

## Reglas de negocio fáciles de romper
- **1 mes de antelación**: cada serie arranca 1 mes antes de su primera entrada (`sumarMeses(..., -1)` en `serieTotal` y `seriePorDeuda`). Es intencional: evita que una deuda nueva se vea como un punto aislado. No "corregir".
- **Una línea por concepto**: el gráfico agrupa por `nombre`; cada deuda tiene un color único de `PALETA` (15 colores hue-ordenados, `src/lib/calc.ts`). El formulario deshabilita colores en uso y hereda el color de un concepto existente al tipear su nombre. No romper la unicidad color↔deuda.
- `visible: false` excluye la entrada del gráfico y de los KPIs (App filtra antes de pasar a `StatsCards`/`BalanceChart`).
- "Repetir hasta" crea N entradas normales (una por mes); las recurrentes NO son un tipo aparte de dato.
- **Importar reemplaza, no suma**: `importarJSON`/`importarCSV` hacen `setEntradas(importadas)` (reemplazan todo el estado); no hay merge con lo existente.

## Quirks
- UI 100% en español.
- Recharts v3: los tooltips custom se pasan como elementos (`content={<TooltipX />}`); si `data` es un union type hay que castearlo (`data as Array<Record<string, unknown>>`) o falla el typecheck.
- El monto se ingresa con coma decimal: `parseFloat(monto.replace(',', '.'))`.
- "Limpiar todo" pide confirmación con doble click: el primer click arma la acción (estado `armado`) y hay ~3,5s antes de que se desarme (App.tsx).
- La tabla de movimientos se ordena por fecha descendente (más reciente arriba, EntryTable.tsx).
- Primer arranque carga datos de ejemplo (`entradasEjemplo()`) solo si la clave de localStorage no existe.
