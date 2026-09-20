import { useRef, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Entrada } from '../types';
import { fmt, fmtFirmado, nombreCorto, seriePorDeuda, serieTotal, type PuntoSerie } from '../lib/calc';

interface Props {
  entradas: Entrada[];
  onToggleConcepto: (nombre: string) => void;
}

type Vista = 'deuda' | 'total';

function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return Math.round(n / 1_000) + 'k';
  return String(Math.round(n));
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function TooltipGrafico({ active, payload }: { active?: boolean; payload?: Array<{ payload: PuntoSerie }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const punto = payload[0].payload;
  return (
    <div className="tooltip-chart">
      <div className="tooltip-titulo">{punto.clave}</div>
      <div className="tooltip-saldo">Saldo: {fmt(punto.saldo)}</div>
      <div className={punto.neto > 0 ? 'monto-credito' : punto.neto < 0 ? 'monto-debito' : ''}>
        Neto: {fmtFirmado(punto.neto)}
      </div>
    </div>
  );
}

function TooltipDeuda({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name?: string | number; value?: string | number; payload?: { etiqueta?: string } }>;
}) {
  if (!active || !payload) return null;
  const filas = payload.filter(
    (p): p is { name: string; value: number; payload?: { etiqueta?: string } } =>
      typeof p.value === 'number' && typeof p.name === 'string'
  );
  if (filas.length === 0) return null;
  return (
    <div className="tooltip-chart">
      <div className="tooltip-titulo">{filas[0].payload?.etiqueta ?? ''}</div>
      {filas.map((f) => (
        <div key={f.name} className="tooltip-item">
          <span>{f.name}</span>
          <span>{fmt(f.value)}</span>
        </div>
      ))}
    </div>
  );
}

function BubblePunto({ vista, fila }: { vista: Vista; fila: PuntoSerie | Record<string, string | number> }) {
  if (vista === 'total') {
    const p = fila as PuntoSerie;
    return (
      <div className="tooltip-chart">
        <div className="tooltip-titulo">{p.etiqueta}</div>
        <div className="tooltip-saldo">Saldo: {fmt(p.saldo)}</div>
        <div className={p.neto > 0 ? 'monto-credito' : p.neto < 0 ? 'monto-debito' : ''}>
          Neto: {fmtFirmado(p.neto)}
        </div>
      </div>
    );
  }
  const filaRec = fila as Record<string, string | number>;
  const items: Array<[string, number]> = [];
  for (const [k, v] of Object.entries(filaRec)) {
    if (k !== 'clave' && k !== 'etiqueta' && typeof v === 'number') items.push([k, v]);
  }
  return (
    <div className="tooltip-chart">
      <div className="tooltip-titulo">{String(filaRec.etiqueta ?? '')}</div>
      {items.map(([nombre, valor]) => (
        <div key={nombre} className="tooltip-item">
          <span>{nombre}</span>
          <span>{fmt(valor)}</span>
        </div>
      ))}
    </div>
  );
}

export default function BalanceChart({ entradas, onToggleConcepto }: Props) {
  const [vista, setVista] = useState<Vista>('deuda');
  const [puntoActivo, setPuntoActivo] = useState<{ x: number; y: number; indice: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  if (entradas.length === 0) {
    return (
      <div className="tarjeta grafico">
        <h2>Evolución de la deuda</h2>
        <p className="vacio">
          No hay entradas visibles para graficar. Cargá movimientos o activá los toggles de la tabla.
        </p>
      </div>
    );
  }

  const visibles = entradas.filter((e) => e.visible);
  const totalSerie = serieTotal(visibles);
  const deudas = seriePorDeuda(visibles);
  const colorTotal = totalSerie.length > 0 && totalSerie[totalSerie.length - 1].saldo > 0 ? cssVar('--credit') : cssVar('--debit');

  let picoPunto: PuntoSerie | null = null;
  for (const p of totalSerie) {
    if (!picoPunto || p.saldo > picoPunto.saldo) picoPunto = p;
  }

  const porNombre = new Map<string, { color: string; visible: boolean }>();
  for (const e of entradas) {
    const prev = porNombre.get(e.nombre);
    if (!prev) porNombre.set(e.nombre, { color: e.color, visible: e.visible });
    else if (e.visible) prev.visible = true;
  }
  const conceptos = [...porNombre.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'es'))
    .map(([nombre, meta]) => ({ nombre, color: meta.color, visible: meta.visible }));

  let data: PuntoSerie[] | Array<Record<string, string | number>>;
  if (vista === 'total') {
    data = totalSerie;
  } else {
    const etiquetas = new Map<string, string>();
    const claves = new Set<string>();
    for (const d of deudas) {
      for (const p of d.puntos) {
        claves.add(p.clave);
        etiquetas.set(p.clave, p.etiqueta);
      }
    }
    data = [...claves].sort().map((clave) => {
      const fila: Record<string, string | number> = { clave, etiqueta: etiquetas.get(clave)! };
      for (const d of deudas) {
        const p = d.puntos.find((p) => p.clave === clave);
        if (p) fila[d.nombre] = p.saldo;
      }
      return fila;
    });
  }

  const manejarTap = (estado: { activeIndex?: number | string | null } | null, e: React.MouseEvent) => {
    const scrollRect = scrollRef.current?.getBoundingClientRect();
    const contentRect = chartRef.current?.getBoundingClientRect();
    if (!scrollRect || !contentRect) {
      setPuntoActivo(null);
      return;
    }

    let indice: number | null = null;
    const act = estado?.activeIndex;
    if (typeof act === 'number' && Number.isInteger(act)) indice = act;
    else if (typeof act === 'string') {
      const n = Number(act);
      if (Number.isInteger(n)) indice = n;
    }

    if (indice === null) {
      const x = e.clientX - contentRect.left;
      const plotW = contentRect.width - 48 - 10;
      const n = data.length;
      if (n === 1) indice = 0;
      else if (plotW > 0 && n > 1) {
        const est = Math.round((x - 48) / (plotW / (n - 1)));
        if (est >= 0 && est < n) indice = est;
      }
    }

    if (indice === null || indice >= data.length) {
      setPuntoActivo(null);
      return;
    }

    setPuntoActivo((prev) =>
      prev && prev.indice === indice
        ? null
        : { indice, x: e.clientX - scrollRect.left, y: e.clientY - scrollRect.top }
    );
  };

  return (
    <div className="tarjeta grafico">
      <div className="grafico-head">
        <h2>Evolución de la deuda</h2>
        <div className="segmento selector-vista">
          <button
            type="button"
            className={vista === 'deuda' ? 'seleccionado' : ''}
            onClick={() => { setVista('deuda'); setPuntoActivo(null); }}
          >
            Por deuda
          </button>
          <button
            type="button"
            className={vista === 'total' ? 'seleccionado' : ''}
            onClick={() => { setVista('total'); setPuntoActivo(null); }}
          >
            Línea total
          </button>
        </div>
      </div>

      {vista === 'deuda' && conceptos.length > 0 && (
        <div className="leyenda-grafico">
          {conceptos.map((c) => (
            <button
              key={c.nombre}
              type="button"
              className={`item-deuda ${c.visible ? '' : 'oculto'}`}
              onClick={() => onToggleConcepto(c.nombre)}
              title={`${c.visible ? 'Ocultar' : 'Mostrar'} ${c.nombre} en el gráfico`}
            >
              <span className="dot" style={{ background: c.color }}></span>
              <span className="nombre">{nombreCorto(c.nombre)}</span>
            </button>
          ))}
        </div>
      )}

      {visibles.length === 0 ? (
        <p className="vacio">
          No hay entradas visibles para graficar. Activá algún concepto de la leyenda o los toggles de la tabla.
        </p>
      ) : (
        <div className="grafico-scroll" ref={scrollRef}>
          <div className="chart-ancho" ref={chartRef}>
        <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data as Array<Record<string, unknown>>} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} onClick={manejarTap}>
          <CartesianGrid stroke={cssVar('--border')} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="etiqueta"
            tick={{ fill: cssVar('--muted'), fontSize: 11 }}
            axisLine={{ stroke: cssVar('--border') }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: cssVar('--muted'), fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={compact}
            width={48}
          />
          <Tooltip content={vista === 'deuda' ? <TooltipDeuda /> : <TooltipGrafico />} cursor={{ stroke: cssVar('--chart-line') }} />
          <ReferenceLine y={0} stroke={cssVar('--chart-line')} />
          {vista === 'total' ? (
            <>
              <Line
                type="monotone"
                dataKey="saldo"
                stroke={colorTotal}
                strokeWidth={2.5}
                dot={{ r: 3, fill: colorTotal, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              {picoPunto && picoPunto.saldo > 0 && (
                <ReferenceDot
                  x={picoPunto.etiqueta}
                  y={picoPunto.saldo}
                  r={5}
                  fill={colorTotal}
                  stroke={cssVar('--pico')}
                  strokeWidth={2}
                  label={{
                    value: 'Pico',
                    position: 'top',
                    fill: cssVar('--pico'),
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
              )}
            </>
          ) : (
            deudas.map((d) => (
              <Line
                key={d.nombre}
                type="monotone"
                dataKey={(fila: Record<string, unknown>) => fila[d.nombre] as number | undefined}
                stroke={d.color}
                strokeWidth={2}
                dot={{ r: 3, fill: d.color, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            ))
          )}
        </LineChart>
        </ResponsiveContainer>
          </div>
          {puntoActivo && puntoActivo.indice >= 0 && puntoActivo.indice < data.length && (
            <div
              className="bubble-punto"
              style={{
                left: Math.max(4, Math.min(puntoActivo.x + 12, (scrollRef.current?.clientWidth ?? 320) - 190 - 4)),
                top: Math.max(4, puntoActivo.y - 44),
              }}
            >
              <BubblePunto vista={vista} fila={data[puntoActivo.indice]} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
