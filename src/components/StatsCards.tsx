import type { Entrada } from '../types';
import { fmt, fmtFirmado, fmtPct, kpis } from '../lib/calc';

interface Props {
  entradas: Entrada[];
}

export default function StatsCards({ entradas }: Props) {
  const s = kpis(entradas);
  const positiva = s.saldoActual > 0;
  const variacion = s.variacion;

  return (
    <div className="kpis">
      <div className="kpi destacada">
        <span className="label">Saldo actual</span>
        <span className="valor truncar monto-pendiente" title={fmt(s.saldoActual)}>{fmt(s.saldoActual)}</span>
        <span className="sub">{positiva ? 'Debés' : s.saldoActual < 0 ? 'Saldo a favor' : 'Sin deuda'}</span>
      </div>
      <div className="kpi">
        <span className="label">Total cargado</span>
        <span className="valor truncar monto-credito" title={fmt(s.totalCredito)}>{fmt(s.totalCredito)}</span>
        <span className="sub">créditos</span>
      </div>
      <div className="kpi">
        <span className="label">Total abonado</span>
        <span className="valor truncar monto-debito" title={fmt(s.totalDebito)}>{fmt(s.totalDebito)}</span>
        <span className="sub">débitos</span>
      </div>
      <div className="kpi">
        <span className="label">Progreso de pago</span>
        <span className="valor truncar monto-debito" title={s.porcentajePagado === null ? undefined : fmtPct(s.porcentajePagado)}>{s.porcentajePagado === null ? '—' : fmtPct(s.porcentajePagado)}</span>
        <span className="sub">de lo cargado</span>
      </div>
      <div className="kpi">
        <span className="label">Pico histórico</span>
        <span className="valor truncar monto-pico" title={s.pico === null ? undefined : fmt(s.pico)}>{s.pico === null ? '—' : fmt(s.pico)}</span>
        <span className="sub">{s.picoEtiqueta ? `máximo en ${s.picoEtiqueta}` : ''}</span>
      </div>
      <div className="kpi">
        <span className="label">Últimos 3 meses</span>
        <span className={`valor truncar ${variacion === null ? '' : variacion > 0 ? 'monto-credito' : variacion < 0 ? 'monto-debito' : ''}`} title={variacion === null ? undefined : fmtFirmado(variacion)}>
          {variacion === null ? '—' : `${variacion > 0 ? '▲' : variacion < 0 ? '▼' : '▪'} ${fmtFirmado(variacion)}`}
        </span>
        <span className="sub">{s.variacionMeses === 1 ? 'último mes' : 'variación'}</span>
      </div>
      <div className="kpi">
        <span className="label">Mayor acumulado</span>
        <span className="valor truncar" title={s.topNombre ?? undefined}>{s.topNombre ?? '—'}</span>
        <span className={`sub ${s.topMonto > 0 ? 'monto-credito' : 'monto-debito'}`} title={s.topNombre ? fmtFirmado(s.topMonto) : undefined}>
          {s.topNombre ? fmtFirmado(s.topMonto) : ''}
        </span>
      </div>
      <div className="kpi">
        <span className="label">Movimientos</span>
        <span className="valor truncar">{s.cantidad}</span>
        <span className="sub">registrados</span>
      </div>
    </div>
  );
}
