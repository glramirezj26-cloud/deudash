import { useState } from 'react';
import type { Entrada } from '../types';
import { fmt, fmtFirmado, fmtPct, kpis } from '../lib/calc';

interface Props {
  entradas: Entrada[];
}

const PERIODOS = [1, 2, 3, 4, 5, 6];

export default function StatsCards({ entradas }: Props) {
  const [periodo, setPeriodo] = useState(3);
  const s = kpis(entradas, periodo);

  return (
    <div className="kpis">
      <div className="kpi destacada">
        <span className="label">Saldo actual</span>
        <span className="cuerpo">
          <span className="lado-saldo">
            <span className="valor truncar monto-pendiente" title={fmt(s.saldoActual)}>{fmt(s.saldoActual)}</span>
          </span>
          {s.porcentajePagado !== null && s.pctRestante !== null && (
            <span className="lado-progreso">
              <span
                className="barra-progreso"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.max(0, Math.min(100, Math.round(s.porcentajePagado)))}
                aria-label="Porcentaje abonado de lo cargado"
                title={fmtPct(s.porcentajePagado)}
              >
                <span style={{ width: `${Math.max(0, Math.min(100, s.porcentajePagado))}%` }}></span>
              </span>
              <span className="fila">
                <span className="k">Abonado</span>
                <span className="v monto-debito">{fmtPct(s.porcentajePagado)}</span>
              </span>
              <span className="fila">
                <span className="k">Restante</span>
                <span className="v monto-pendiente">{fmtPct(s.pctRestante)}</span>
              </span>
            </span>
          )}
        </span>
      </div>
      <div className="kpi">
        <span className="label">Total cargado</span>
        <span className="valor truncar monto-credito" title={fmt(s.totalCredito)}>{fmt(s.totalCredito)}</span>
      </div>
      <div className="kpi">
        <span className="label">Total abonado</span>
        <span className="valor truncar monto-debito" title={fmt(s.totalDebito)}>{fmt(s.totalDebito)}</span>
      </div>
      <div className="kpi variacion">
        <span className="label">Variación</span>
        <span className={`valor truncar ${s.variacion === null ? '' : s.variacion > 0 ? 'monto-credito' : s.variacion < 0 ? 'monto-debito' : ''}`} title={s.variacion === null ? undefined : fmtFirmado(s.variacion)}>
          {s.variacion === null ? '—' : `${s.variacion > 0 ? '▲' : s.variacion < 0 ? '▼' : '▪'} ${fmtFirmado(s.variacion)}`}
        </span>
        {s.variacion !== null && s.saldoPrevio !== null && (
          <span className="detalle">
            <span className="fila">
              <span className="k">Saldo previo</span>
              <span className="v">{fmt(s.saldoPrevio)}</span>
            </span>
          </span>
        )}
        <span className="selectores">
          {PERIODOS.map((m) => (
            <button
              key={m}
              type="button"
              className={`pill ${m === periodo ? 'activo' : ''}`}
              aria-pressed={m === periodo}
              onClick={() => setPeriodo(m)}
            >
              {m}m
            </button>
          ))}
        </span>
      </div>
      <div className="kpi">
        <span className="label">Pico histórico</span>
        <span className="valor truncar monto-pico" title={s.pico === null ? undefined : fmt(s.pico)}>{s.pico === null ? '—' : fmt(s.pico)}</span>
        <span className="detalle">
          <span className="fila">
            <span className="k">Máximo en</span>
            <span className="v">{s.picoEtiqueta ?? '—'}</span>
          </span>
          {s.pctBajoPico !== null && (
            <span className="fila">
              <span className="k">Bajo del pico</span>
              <span className="v monto-debito">{fmtPct(Math.abs(s.pctBajoPico))}</span>
            </span>
          )}
        </span>
      </div>
      <div className="kpi">
        <span className="label">Mayor acumulado</span>
        <span className="valor truncar" title={s.topNombre ?? undefined}>{s.topNombre ?? '—'}</span>
        <span className={`sub ${s.topMonto > 0 ? 'monto-credito' : 'monto-debito'}`} title={s.topNombre ? fmtFirmado(s.topMonto) : undefined}>
          {s.topNombre ? fmtFirmado(s.topMonto) : ''}
        </span>
        {s.topPct !== null && (
          <span className="detalle">
            <span className="fila">
              <span className="k">Del saldo actual</span>
              <span className="v">{fmtPct(s.topPct)}</span>
            </span>
          </span>
        )}
      </div>
    </div>
  );
}