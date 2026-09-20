import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
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

const PIN_MS = 3000;

function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return Math.round(n / 1_000) + 'k';
  return String(Math.round(n));
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function ContenidoTotal({ punto }: { punto: PuntoSerie }) {
  return (
    <div className="tooltip-chart">
      <div className="tooltip-titulo">{punto.etiqueta}</div>
      <div className="tooltip-saldo">Saldo: {fmt(punto.saldo)}</div>
      <div className={punto.neto > 0 ? 'monto-credito' : punto.neto < 0 ? 'monto-debito' : ''}>
        Neto: {fmtFirmado(punto.neto)}
      </div>
    </div>
  );
}

function ContenidoDeuda({ fila }: { fila: Record<string, string | number> }) {
  const items: Array<[string, number]> = [];
  for (const [k, v] of Object.entries(fila)) {
    if (k !== 'clave' && k !== 'etiqueta' && typeof v === 'number') items.push([k, v]);
  }
  return (
    <div className="tooltip-chart">
      <div className="tooltip-titulo">{String(fila.etiqueta ?? '')}</div>
      {items.map(([nombre, valor]) => (
        <div key={nombre} className="tooltip-item">
          <span>{nombre}</span>
          <span>{fmt(valor)}</span>
        </div>
      ))}
    </div>
  );
}

function TooltipGrafico({ active, payload }: { active?: boolean; payload?: Array<{ payload: PuntoSerie }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const punto = payload[0]?.payload;
  if (!punto) return null;
  return <ContenidoTotal punto={punto} />;
}

function TooltipDeuda({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: Record<string, string | number> }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const fila = payload[0]?.payload;
  if (!fila) return null;
  return <ContenidoDeuda fila={fila} />;
}

function BubblePunto({ vista, fila }: { vista: Vista; fila: PuntoSerie | Record<string, string | number> }) {
  if (vista === 'total') return <ContenidoTotal punto={fila as PuntoSerie} />;
  return <ContenidoDeuda fila={fila as Record<string, string | number>} />;
}

export default function BalanceChart({ entradas, onToggleConcepto }: Props) {
  const [vista, setVista] = useState<Vista>('deuda');
  const [puntoActivo, setPuntoActivo] = useState<{ xp: number; yp: number; indice: number } | null>(null);
  const [posicion, setPosicion] = useState<{ left: number; top: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const pinTimerRef = useRef<number | null>(null);
  const esTouch = useMemo(() => window.matchMedia('(any-hover: none)').matches, []);
  const visibles = entradas.filter((e) => e.visible);

  useEffect(() => {
    if (pinTimerRef.current !== null) window.clearTimeout(pinTimerRef.current);
    pinTimerRef.current = null;
    setPuntoActivo(null);
  }, [vista, visibles.length]);

  useEffect(
    () => () => {
      if (pinTimerRef.current !== null) window.clearTimeout(pinTimerRef.current);
    },
    []
  );

  const medirBurbuja = useCallback(() => {
    const cont = scrollRef.current;
    const bur = bubbleRef.current;
    const punto = puntoActivo;
    if (!cont || !bur || !punto) {
      setPosicion(null);
      return;
    }
    const br = bur.getBoundingClientRect();
    const cw = cont.clientWidth;
    const ch = cont.clientHeight;
    let left = Math.round(punto.xp - br.width / 2);
    left = Math.max(4, Math.min(left, Math.max(4, cw - br.width - 4)));
    let top = punto.yp - br.height - 8;
    if (top < 4) top = punto.yp + 8;
    top = Math.max(4, Math.min(top, Math.max(4, ch - br.height - 4)));
    setPosicion({ left, top });
  }, [puntoActivo]);

  useLayoutEffect(() => {
    medirBurbuja();
  }, [medirBurbuja]);

  useEffect(() => {
    if (!puntoActivo) return;
    window.addEventListener('resize', medirBurbuja);
    return () => window.removeEventListener('resize', medirBurbuja);
  }, [puntoActivo, medirBurbuja]);

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

  const totalSerie = serieTotal(visibles);
  const deudas = seriePorDeuda(visibles);
  const ultimo = totalSerie[totalSerie.length - 1];
  const colorTotal = ultimo && ultimo.saldo > 0 ? cssVar('--credit') : cssVar('--debit');

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

  const manejarTap = (
    estado: { activeIndex?: number | string | null; activeCoordinate?: { x?: number; y?: number } } | null,
    e: MouseEvent
  ) => {
    const scrollRect = scrollRef.current?.getBoundingClientRect();
    if (!scrollRect) {
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
      const rect = chartRef.current?.getBoundingClientRect();
      if (!rect) {
        setPuntoActivo(null);
        return;
      }
      const x = e.clientX - rect.left;
      const plotW = rect.width - 48 - 10;
      const n = data.length;
      if (n === 1) indice = 0;
      else if (plotW > 0 && n > 1) {
        const est = Math.round((x - 48) / (plotW / (n - 1)));
        if (est >= 0 && est < n) indice = est;
      }
    }

    if (indice === null || indice >= data.length || indice < 0) {
      if (pinTimerRef.current !== null) window.clearTimeout(pinTimerRef.current);
      pinTimerRef.current = null;
      setPuntoActivo(null);
      return;
    }

    const coord = estado?.activeCoordinate;

    let xp: number;
    let yp: number;
    if (
      coord &&
      typeof coord.x === 'number' &&
      Number.isFinite(coord.x) &&
      typeof coord.y === 'number' &&
      Number.isFinite(coord.y)
    ) {
      xp = coord.x;
      yp = coord.y;
    } else {
      const rect = chartRef.current?.getBoundingClientRect();
      const plotW = rect ? rect.width - 48 - 10 : 0;
      const n = data.length;
      xp = plotW > 0 && n > 1 ? 48 + (plotW / (n - 1)) * indice : 48 + plotW / 2;
      yp = e.clientY - scrollRect.top;
    }

    if (pinTimerRef.current !== null) window.clearTimeout(pinTimerRef.current);
    pinTimerRef.current = null;

    if (puntoActivo && puntoActivo.indice === indice) {
      setPuntoActivo(null);
      return;
    }

    setPuntoActivo({ indice, xp, yp });
    pinTimerRef.current = window.setTimeout(() => setPuntoActivo(null), PIN_MS);
  };

  const filaBurbuja =
    puntoActivo && puntoActivo.indice >= 0 && puntoActivo.indice < data.length
      ? data[puntoActivo.indice]
      : null;

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
              onClick={() => {
                setPuntoActivo(null);
                onToggleConcepto(c.nombre);
              }}
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
          <Tooltip
            content={esTouch || puntoActivo ? () => null : vista === 'deuda' ? <TooltipDeuda /> : <TooltipGrafico />}
            cursor={esTouch ? false : { stroke: cssVar('--chart-line') }}
          />
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
          {puntoActivo && filaBurbuja && (
            <div
              ref={bubbleRef}
              className="bubble-punto"
              style={posicion ? { left: posicion.left, top: posicion.top } : { visibility: 'hidden' }}
            >
              <BubblePunto vista={vista} fila={filaBurbuja} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
