import { useEffect, useRef, useState } from 'react';
import type { Entrada } from './types';
import {
  cargarEntradas,
  entradasEjemplo,
  exportarJSON,
  guardarEntradas,
  importarJSON,
  primerArranque,
} from './lib/store';
import { exportarCSV, importarCSV as importarCSVArchivo } from './lib/csv';
import EntryForm from './components/EntryForm';
import EntryTable from './components/EntryTable';
import StatsCards from './components/StatsCards';
import BalanceChart from './components/BalanceChart';
import Composicion from './components/Composicion';

type Toast = { tipo: 'ok' | 'err'; texto: string } | null;

function App() {
  const [entradas, setEntradas] = useState<Entrada[]>(() =>
    primerArranque() ? entradasEjemplo() : cargarEntradas()
  );
  const [editando, setEditando] = useState<Entrada | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [armado, setArmado] = useState(false);
  const [armadoEjemplo, setArmadoEjemplo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);
  const timerEjemploRef = useRef<number | null>(null);

  useEffect(() => {
    guardarEntradas(entradas);
  }, [entradas]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (timerEjemploRef.current) clearTimeout(timerEjemploRef.current);
  }, []);

  const agregar = (lista: Omit<Entrada, 'id' | 'visible'>[]) => {
    if (editando) {
      const d = lista[0];
      setEntradas((prev) => prev.map((e) => (e.id === editando.id ? { ...editando, ...d } : e)));
      setEditando(null);
      return;
    }
    const nuevas = lista.map((d) => ({ ...d, id: crypto.randomUUID(), visible: true }));
    setEntradas((prev) => [...prev, ...nuevas]);
    if (nuevas.length > 1) setToast({ tipo: 'ok', texto: `${nuevas.length} entradas creadas` });
  };

  const duplicar = (e: Entrada) => {
    setEntradas((prev) => [...prev, { ...e, id: crypto.randomUUID() }]);
  };

  const eliminar = (id: string) => {
    if (!window.confirm('¿Eliminar esta entrada?')) return;
    setEntradas((prev) => prev.filter((e) => e.id !== id));
    if (editando?.id === id) setEditando(null);
  };

  const toggleVisible = (id: string) => {
    setEntradas((prev) => prev.map((e) => (e.id === id ? { ...e, visible: !e.visible } : e)));
  };

  const toggleAll = (visible: boolean) => {
    setEntradas((prev) => prev.map((e) => ({ ...e, visible })));
  };

  const toggleConcepto = (nombre: string) => {
    const clave = nombre.toLowerCase();
    setEntradas((prev) => {
      const algunaVisible = prev.some((e) => e.nombre.toLowerCase() === clave && e.visible);
      return prev.map((e) =>
        e.nombre.toLowerCase() === clave ? { ...e, visible: !algunaVisible } : e
      );
    });
  };

  const recolorear = (nombre: string, color: string) => {
    setEntradas((prev) =>
      prev.map((e) => (e.nombre.toLowerCase() === nombre.toLowerCase() ? { ...e, color } : e))
    );
  };

  const eliminarConcepto = (nombre: string) => {
    const cantidad = entradas.filter((e) => e.nombre.toLowerCase() === nombre.toLowerCase()).length;
    const msg = `¿Eliminar la deuda "${nombre}" y sus ${cantidad} ${cantidad === 1 ? 'movimiento' : 'movimientos'}?`;
    if (!window.confirm(msg)) return;
    setEntradas((prev) => prev.filter((e) => e.nombre.toLowerCase() !== nombre.toLowerCase()));
    if (editando?.nombre.toLowerCase() === nombre.toLowerCase()) setEditando(null);
  };

  const importar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const importadas = await importarJSON(f);
      setEntradas(importadas);
      setEditando(null);
      setToast({ tipo: 'ok', texto: `${importadas.length} entradas importadas` });
    } catch (err) {
      setToast({ tipo: 'err', texto: err instanceof Error ? err.message : 'Error al importar' });
    } finally {
      e.target.value = '';
    }
  };

  const importarCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const importadas = await importarCSVArchivo(f);
      setEntradas(importadas);
      setEditando(null);
      setToast({ tipo: 'ok', texto: `${importadas.length} entradas importadas` });
    } catch (err) {
      setToast({ tipo: 'err', texto: err instanceof Error ? err.message : 'Error al importar' });
    } finally {
      e.target.value = '';
    }
  };

  const limpiar = () => {
    if (armado) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setArmado(false);
      setEntradas([]);
      setEditando(null);
      return;
    }
    setArmado(true);
    timerRef.current = window.setTimeout(() => setArmado(false), 3500);
  };

  const cargarEjemplo = () => {
    if (armadoEjemplo) {
      if (timerEjemploRef.current) clearTimeout(timerEjemploRef.current);
      setArmadoEjemplo(false);
      setEntradas(entradasEjemplo());
      setEditando(null);
      return;
    }
    setArmadoEjemplo(true);
    timerEjemploRef.current = window.setTimeout(() => setArmadoEjemplo(false), 3500);
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>DeuDash</h1>
          <p className="subtitulo">Panel de seguimiento de deudas</p>
        </div>
        <div className="acciones">
          <button onClick={() => exportarJSON(entradas)}>Exportar JSON</button>
          <button onClick={() => fileRef.current?.click()}>Importar JSON</button>
          <button onClick={() => exportarCSV(entradas)}>Exportar CSV</button>
          <button onClick={() => csvRef.current?.click()}>Importar CSV</button>
          <button
            className={`btn-confirmar ${armadoEjemplo ? 'peligro armado' : ''}`}
            onClick={cargarEjemplo}
          >
            {armadoEjemplo ? '¿Seguro? Cargar ejemplo' : 'Datos de ejemplo'}
          </button>
          <button
            className={`btn-confirmar ${armado ? 'peligro armado' : 'peligro'}`}
            onClick={limpiar}
          >
            {armado ? '¿Seguro? Confirmar limpieza' : 'Limpiar todo'}
          </button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={importar} />
          <input ref={csvRef} type="file" accept=".csv,text/csv" hidden onChange={importarCsv} />
        </div>
      </header>

      <StatsCards entradas={entradas.filter((e) => e.visible)} />
      <BalanceChart entradas={entradas} onToggleConcepto={toggleConcepto} />
      <Composicion
        entradas={entradas.filter((e) => e.visible)}
        onRecolor={recolorear}
        onEliminarConcepto={eliminarConcepto}
      />

      <div className="columnas">
        <EntryForm entradas={entradas} editando={editando} alGuardar={agregar} alCancelar={() => setEditando(null)} />
        <EntryTable
          entradas={entradas}
          onToggle={toggleVisible}
          onToggleAll={toggleAll}
          onEditar={setEditando}
          onDuplicar={duplicar}
          onEliminar={eliminar}
        />
      </div>

      <footer className="leyenda-footer">
        <span>
          <span className="dot" style={{ background: 'var(--credit)' }}></span>
          Crédito (debés)
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--debit)' }}></span>
          Débito (abonás)
        </span>
        <span>Los datos se guardan únicamente en este navegador (localStorage).</span>
      </footer>

      {toast && (
        <div role="status" aria-live="polite" className={`toast ${toast.tipo === 'ok' ? 'toast-ok' : 'toast-error'}`}>{toast.texto}</div>
      )}
    </div>
  );
}

export default App;
