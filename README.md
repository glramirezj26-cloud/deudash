# DeuDash

Panel de seguimiento de deudas. Vista de KPIs, evolución de la deuda por concepto (gráfico de líneas), composición (torta + detalle) y tabla de movimientos. UI 100% en español.

## Stack

- React 19 + TypeScript estricto (Vite 8)
- Recharts 3 para los gráficos
- Persistencia 100% en `localStorage` (clave `deudash.entradas.v1`), con export/import JSON y CSV. Sin backend.

## Comandos

- `npm run dev` — dev server con HMR
- `npm run build` — verificación completa (`tsc -b && vite build`)
- `npm run lint` — oxlint config en `.oxlintrc.json`

## Reglas de dominio (no romper)

- Semántica invertida respecto de la contabilidad: **crédito = lo que debés** (suma a la línea), **débito = abono** (resta). `signo()` es la única fuente de verdad.
- Las fechas son pares `(anio, mes 1-12)`, nunca objetos `Date`; se ordenan con `anio * 12 + mes`.
- Cada serie arranca **1 mes antes** de su primera entrada (evita que una deuda nueva se vea como un punto aislado). No "corregir".
- Una línea por concepto: el gráfico agrupa por `nombre` y cada deuda tiene un color único de `PALETA`. El formulario deshabilita colores en uso y hereda el color de un concepto existente al tipear su nombre.
- `visible: false` excluye la entrada del gráfico y de los KPIs.
- "Repetir hasta" crea N entradas normales (una por mes); no existe un tipo "recurrente" aparte.
- **Importar reemplaza, no suma**: `importarJSON`/`importarCSV` reemplazan todo el estado; al importar se generan ids nuevos para garantizar unicidad.
- El monto se ingresa con coma decimal: `parseFloat(monto.replace(',', '.'))`.
- "Limpiar todo" y "Cargar ejemplo" piden confirmación con doble click (estado `armado`, ~3,5s antes de desarmarse).

## Quirks técnicos

- `tsc -b` corre estricto: `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters` y `erasableSyntaxOnly` (sintaxis no-eraseable como `enum`/`namespace` rompe el build).
- Se importa solo con `type` cuando es tipo de dato (`verbatimModuleSyntax`).
- Recharts 3: los tooltips custom se pasan como elementos (`content={<TooltipX />}`); si `data` es un union type hay que castearlo o falla el typecheck.
- Los gráficos se cargan con `import()` dinámico (lazy) para dividir recharts en su propio chunk.
- La tabla de movimientos se ordena por fecha descendente por defecto.
- Primer arranque carga datos de ejemplo solo si la clave de localStorage no existe.