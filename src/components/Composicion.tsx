import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { Entrada } from '../types';
import { fmt, fmtPct, nombreCorto, PALETA, resumenPorConcepto, type ResumenConcepto } from '../lib/calc';

interface Props {
  entradas: Entrada[];
  onRecolor: (nombre: string, color: string) => void;
  onEliminarConcepto: (nombre: string) => void;
}

type Clave =
  | 'nombre'
  | 'saldo'
  | 'porcentajeRestante'
  | 'porciento'
  | 'totalCredito'
  | 'totalDebito'
  | 'desde'
  | 'ultimoMes'
  | 'mesesActivo';

interface Sort {
  clave: Clave;
  dir: 'asc' | 'desc';
}

function comparar(a: ResumenConcepto, b: ResumenConcepto, clave: Clave, dir: 'asc' | 'desc'): number {
  const invertir = dir === 'asc' ? 1 : -1;
  switch (clave) {
    case 'nombre':
      return a.nombre.localeCompare(b.nombre, 'es') * invertir;
    case 'porcentajeRestante': {
      const av = a.saldo <= 0 ? null : a.porcentajeRestante;
      const bv = b.saldo <= 0 ? null : b.porcentajeRestante;
      if (av === null || bv === null) {
        if (av === null && bv === null) return 0;
        return av === null ? 1 : -1;
      }
      return (av - bv) * invertir;
    }
    case 'saldo':
      return (a.saldo - b.saldo) * invertir;
    case 'porciento':
      return (a.porciento - b.porciento) * invertir;
    case 'totalCredito':
      return (a.totalCredito - b.totalCredito) * invertir;
    case 'totalDebito':
      return (a.totalDebito - b.totalDebito) * invertir;
    case 'desde':
      return (a.desdeFecha - b.desdeFecha) * invertir;
    case 'ultimoMes':
      return (a.ultimoFecha - b.ultimoFecha) * invertir;
    case 'mesesActivo':
      return (a.mesesActivo - b.mesesActivo) * invertir;
  }
}

function TooltipTorta({ active, payload }: { active?: boolean; payload?: Array<{ payload?: ResumenConcepto }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="tooltip-chart">
      <div className="tooltip-titulo">{d.nombre}</div>
      <div className="tooltip-saldo">Saldo: {fmt(d.saldo)}</div>
      <div>{d.porcentajeRestante === null ? '—' : `Resta ${fmtPct(d.porcentajeRestante)}`}</div>
      <div>Del total: {fmtPct(d.porciento)}</div>
    </div>
  );
}

export default function Composicion({ entradas, onRecolor, onEliminarConcepto }: Props) {
  const [recoloreando, setRecoloreando] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>({ clave: 'saldo', dir: 'desc' });
  const resumen = resumenPorConcepto(entradas);
  const ordenadas = [...resumen].sort((a, b) => comparar(a, b, sort.clave, sort.dir));
  const paraTorta = resumen.filter((r) => r.saldo > 0);
  const saldoTotal = resumen.reduce((s, r) => s + r.saldo, 0);
  const cargadoTotal = resumen.reduce((s, r) => s + r.totalCredito, 0);
  const abonadoTotal = resumen.reduce((s, r) => s + r.totalDebito, 0);

  const coloresUsadosEn = (nombre: string): Set<string> =>
    new Set(resumen.filter((r) => r.nombre !== nombre).map((r) => r.color));
  const paletaAgotadaEn = (usados: Set<string>) => PALETA.every((c) => usados.has(c));
  const colorDisponibleEn = (nombre: string, c: string) => {
    const usados = coloresUsadosEn(nombre);
    return paletaAgotadaEn(usados) || !usados.has(c);
  };

  const cambiarOrden = (clave: Clave) => {
    setSort((prev) =>
      prev.clave === clave
        ? { clave, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { clave, dir: clave === 'nombre' ? 'asc' : 'desc' }
    );
  };

  if (entradas.length === 0) {
    return (
      <div className="tarjeta composicion">
        <h2>Composición de la deuda</h2>
        <p className="vacio">No hay entradas visibles para analizar.</p>
      </div>
    );
  }

  return (
    <div className="tarjeta composicion">
      <h2>Composición de la deuda</h2>
      <div className="composicion-grid">
        {paraTorta.length > 0 ? (
          <div className="composicion-pie">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={paraTorta}
                  dataKey="saldo"
                  nameKey="nombre"
                  innerRadius={75}
                  outerRadius={117}
                  paddingAngle={2}
                  stroke="none"
                >
                  {paraTorta.map((r) => (
                    <Cell key={r.nombre} fill={r.color} />
                  ))}
                </Pie>
                <Tooltip content={<TooltipTorta />} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="leyenda-torta">
              {paraTorta.map((r) => (
                <li key={r.nombre}>
                  <span className="dot" style={{ background: r.color }}></span>
                  <span className="nombre truncar" title={r.nombre}>{nombreCorto(r.nombre)}</span>
                  <span className="pct">{fmtPct(r.porciento)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="nota">No hay saldos pendientes para graficar.</p>
        )}

        <div className="tabla-wrap">
          <table className="tabla-resumen">
            <thead>
              <tr>
                <th aria-sort={sort.clave === 'nombre' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="th-ordenable" onClick={() => cambiarOrden('nombre')}>
                    Concepto
                    {sort.clave === 'nombre' && <span aria-hidden>{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span>}
                  </button>
                </th>
                <th className="col-monto" aria-sort={sort.clave === 'saldo' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="th-ordenable" onClick={() => cambiarOrden('saldo')}>
                    Saldo restante
                    {sort.clave === 'saldo' && <span aria-hidden>{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span>}
                  </button>
                </th>
                <th className="col-monto" title="Porcentaje pendiente de saldar" aria-sort={sort.clave === 'porcentajeRestante' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="th-ordenable" onClick={() => cambiarOrden('porcentajeRestante')}>
                    % a saldar
                    {sort.clave === 'porcentajeRestante' && <span aria-hidden>{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span>}
                  </button>
                </th>
                <th className="col-monto" aria-sort={sort.clave === 'porciento' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="th-ordenable" onClick={() => cambiarOrden('porciento')}>
                    % del total
                    {sort.clave === 'porciento' && <span aria-hidden>{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span>}
                  </button>
                </th>
                <th className="col-monto" aria-sort={sort.clave === 'totalCredito' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="th-ordenable" onClick={() => cambiarOrden('totalCredito')}>
                    Cargado
                    {sort.clave === 'totalCredito' && <span aria-hidden>{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span>}
                  </button>
                </th>
                <th className="col-monto" aria-sort={sort.clave === 'totalDebito' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="th-ordenable" onClick={() => cambiarOrden('totalDebito')}>
                    Abonado
                    {sort.clave === 'totalDebito' && <span aria-hidden>{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span>}
                  </button>
                </th>
                <th title="Desde cuándo la tenés" aria-sort={sort.clave === 'desde' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="th-ordenable" onClick={() => cambiarOrden('desde')}>
                    Desde
                    {sort.clave === 'desde' && <span aria-hidden>{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span>}
                  </button>
                </th>
                <th aria-sort={sort.clave === 'ultimoMes' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="th-ordenable" onClick={() => cambiarOrden('ultimoMes')}>
                    Último mov.
                    {sort.clave === 'ultimoMes' && <span aria-hidden>{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span>}
                  </button>
                </th>
                <th title="Meses con al menos una entrada" aria-sort={sort.clave === 'mesesActivo' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="th-ordenable" onClick={() => cambiarOrden('mesesActivo')}>
                    Meses act.
                    {sort.clave === 'mesesActivo' && <span aria-hidden>{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span>}
                  </button>
                </th>
                <th className="col-acciones" title="Elimina la deuda y todos sus movimientos">Eliminar</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((r) => (
                <tr key={r.nombre}>
                  <td className="dot-celda">
                    <span className="dot-fila">
                      <button
                        type="button"
                        className="dot-boton"
                        style={{ background: r.color }}
                        title="Cambiar color"
                        aria-label={`Cambiar color de ${r.nombre}`}
                        onClick={() => setRecoloreando(recoloreando === r.nombre ? null : r.nombre)}
                      ></button>
                      <span className="truncar" title={r.nombre}>
                        {nombreCorto(r.nombre)}
                      </span>
                    </span>
                    {recoloreando === r.nombre && (
                      <div className="paleta-pop">
                        <div className="paleta">
                          {PALETA.map((c) => (
                            <button
                              key={c}
                              type="button"
                              className={`swatch ${r.color === c ? 'seleccionado' : ''}`}
                              style={{ background: c }}
                              disabled={!colorDisponibleEn(r.nombre, c)}
                              onClick={() => {
                                onRecolor(r.nombre, c);
                                setRecoloreando(null);
                              }}
                              title={c === r.color ? 'Color actual' : 'Elegir color'}
                              aria-label={`Color ${c}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="col-monto monto-pendiente">{fmt(r.saldo)}</td>
                  <td className="col-monto">
                    {r.porcentajeRestante === null ? '—' : r.saldo <= 0 ? (
                      <span className="badge badge-debito">saldada</span>
                    ) : (
                      fmtPct(r.porcentajeRestante)
                    )}
                  </td>
                  <td className="col-monto">{fmtPct(r.porciento)}</td>
                  <td className="col-monto monto-credito">{fmt(r.totalCredito)}</td>
                  <td className="col-monto monto-debito">{fmt(r.totalDebito)}</td>
                  <td className="fecha">{r.desde}</td>
                  <td className="fecha">{r.ultimoMes}</td>
                  <td>{r.mesesActivo}</td>
                  <td className="col-acciones">
                    <button
                      className="icono peligro"
                      title="Eliminar deuda"
                      aria-label={`Eliminar deuda ${r.nombre}`}
                      onClick={() => onEliminarConcepto(r.nombre)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="col-monto monto-pendiente">{fmt(saldoTotal)}</td>
                <td className="col-monto"></td>
                <td className="col-monto">{fmtPct(resumen.reduce((s, r) => s + r.porciento, 0))}</td>
                <td className="col-monto monto-credito">{fmt(cargadoTotal)}</td>
                <td className="col-monto monto-debito">{fmt(abonadoTotal)}</td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
