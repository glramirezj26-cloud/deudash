import { useEffect, useRef, useState } from 'react';
import type { Entrada } from '../types';
import { exportarJSON } from '../lib/store';
import { exportarCSV } from '../lib/csv';

interface Props {
  entradas: Entrada[];
  armado: boolean;
  armadoEjemplo: boolean;
  onLimpiar: () => void;
  onCargarEjemplo: () => void;
  onImportarJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportarCSV: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function HeaderMenu({
  entradas,
  armado,
  armadoEjemplo,
  onLimpiar,
  onCargarEjemplo,
  onImportarJSON,
  onImportarCSV,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', alClick);
    document.addEventListener('keydown', alTecla);
    return () => {
      document.removeEventListener('mousedown', alClick);
      document.removeEventListener('keydown', alTecla);
    };
  }, [abierto]);

  const alternar = () => {
    if (abierto && (armado || armadoEjemplo)) return;
    setAbierto((v) => !v);
  };

  const cerrar = () => setAbierto(false);

  const peligro = (yaArmado: boolean, accion: () => void) => {
    accion();
    if (yaArmado) cerrar();
    else setAbierto(true);
  };

  return (
    <div className="menu-acciones" ref={ref}>
      <button
        type="button"
        className="menu-toggle"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={alternar}
      >
        Opciones <span className={`chevron ${abierto ? 'abierto' : ''}`} aria-hidden>▾</span>
      </button>

      {abierto && (
        <div className="menu-acciones-drop" role="menu">
          <button type="button" onClick={() => { exportarJSON(entradas); cerrar(); }}>
            Exportar JSON
          </button>
          <button type="button" onClick={() => jsonRef.current?.click()}>
            Importar JSON
          </button>
          <button type="button" onClick={() => { exportarCSV(entradas); cerrar(); }}>
            Exportar CSV
          </button>
          <button type="button" onClick={() => csvRef.current?.click()}>
            Importar CSV
          </button>
          <button
            type="button"
            className={`peligro ${armadoEjemplo ? 'armado' : ''}`}
            onClick={() => peligro(armadoEjemplo, onCargarEjemplo)}
          >
            {armadoEjemplo ? '¿Seguro? Cargar ejemplo' : 'Datos de ejemplo'}
          </button>
          <button
            type="button"
            className={`peligro ${armado ? 'armado' : ''}`}
            onClick={() => peligro(armado, onLimpiar)}
          >
            {armado ? '¿Seguro? Confirmar limpieza' : 'Limpiar todo'}
          </button>
        </div>
      )}

      <input
        ref={jsonRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(e) => { onImportarJSON(e); cerrar(); }}
      />
      <input
        ref={csvRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => { onImportarCSV(e); cerrar(); }}
      />
    </div>
  );
}