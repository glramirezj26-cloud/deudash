import { useState } from 'react';
import type { Entrada } from '../types';
import { fmt, MES_CORTO, nombreCorto } from '../lib/calc';

type Clave = 'nombre' | 'fecha' | 'tipo' | 'monto';

interface Sort {
  clave: Clave;
  dir: 'asc' | 'desc';
}

interface Props {
  entradas: Entrada[];
  onToggle: (id: string) => void;
  onToggleAll: (visible: boolean) => void;
  onEditar: (e: Entrada) => void;
  onDuplicar: (e: Entrada) => void;
  onEliminar: (id: string) => void;
}

const CLAVES: Clave[] = ['nombre', 'fecha', 'tipo', 'monto'];

function comparar(a: Entrada, b: Entrada, clave: Clave): number {
  switch (clave) {
    case 'nombre':
      return a.nombre.localeCompare(b.nombre, 'es');
    case 'fecha':
      return a.anio * 12 + a.mes - (b.anio * 12 + b.mes);
    case 'tipo':
      return a.tipo.localeCompare(b.tipo, 'es');
    case 'monto':
      return a.monto - b.monto;
  }
}

export default function EntryTable({ entradas, onToggle, onToggleAll, onEditar, onDuplicar, onEliminar }: Props) {
  const [sort, setSort] = useState<Sort>({ clave: 'fecha', dir: 'desc' });

  const ordenadas = [...entradas].sort((a, b) => {
    const r = comparar(a, b, sort.clave);
    return sort.dir === 'asc' ? r : -r;
  });
  const ocultas = entradas.filter((e) => !e.visible).length;
  const todasVisibles = entradas.length > 0 && ocultas === 0;

  const cambiarOrden = (clave: Clave) => {
    setSort((prev) =>
      prev.clave === clave
        ? { clave, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { clave, dir: clave === 'fecha' || clave === 'monto' ? 'desc' : 'asc' }
    );
  };

  if (entradas.length === 0) {
    return (
      <div className="tarjeta">
        <h2>Movimientos</h2>
        <p className="vacio">Todavía no cargaste ninguna entrada.</p>
      </div>
    );
  }

  return (
    <div className="tarjeta">
      <div className="tabla-head">
        <h2>Movimientos</h2>
        <span className="nota">
          {ocultas > 0 && `${ocultas} oculta${ocultas > 1 ? 's' : ''} en el gráfico`}
          <label className="toggle-all">
            <input
              type="checkbox"
              checked={todasVisibles}
              onChange={(e) => onToggleAll(e.target.checked)}
            />
            ver todas
          </label>
        </span>
      </div>
      <div className="tabla-wrap">
        <table>
          <thead>
            <tr>
              <th className="col-ver">Ver</th>
              {CLAVES.map((clave) => (
                <th
                  key={clave}
                  className={clave === 'monto' ? 'col-monto' : ''}
                  aria-sort={sort.clave === clave ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <button type="button" className="th-ordenable" onClick={() => cambiarOrden(clave)}>
                    {clave === 'nombre'
                      ? 'Nombre'
                      : clave === 'fecha'
                        ? 'Fecha'
                        : clave === 'tipo'
                          ? 'Tipo'
                          : 'Monto'}
                    {sort.clave === clave && <span aria-hidden>{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span>}
                  </button>
                </th>
              ))}
              <th className="col-acciones"></th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((e) => (
              <tr key={e.id} className={e.visible ? '' : 'fila-oculta'}>
                <td>
                  <input
                    type="checkbox"
                    checked={e.visible}
                    onChange={() => onToggle(e.id)}
                    title={e.visible ? 'Ocultar del gráfico' : 'Mostrar en el gráfico'}
                  />
                </td>
                <td className="celda-nombre">
                  <span className="dot" style={{ background: e.color }}></span>
                  <span title={e.nombre}>{nombreCorto(e.nombre)}</span>
                </td>
                <td className="fecha">
                  {MES_CORTO[e.mes - 1]} {e.anio}
                </td>
                <td>
                  <span className={`badge ${e.tipo === 'credito' ? 'badge-credito' : 'badge-debito'}`}>
                    {e.tipo === 'credito' ? 'crédito' : 'débito'}
                  </span>
                </td>
                <td className={`col-monto ${e.tipo === 'credito' ? 'monto-credito' : 'monto-debito'}`}>{fmt(e.monto)}</td>
                <td className="col-acciones">
                  <button className="icono" title="Editar" onClick={() => onEditar(e)}>
                    ✎
                  </button>
                  <button className="icono" title="Duplicar" onClick={() => onDuplicar(e)}>
                    ⧉
                  </button>
                  <button className="icono peligro" title="Eliminar" onClick={() => onEliminar(e.id)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
