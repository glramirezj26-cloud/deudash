import type { Entrada } from '../types';
import { colorPorNombre, normalizarColores } from './calc';

const KEY = 'deudash.entradas.v1';

export function uuid(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function esValida(v: unknown): v is Entrada {
  if (typeof v !== 'object' || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.nombre === 'string' &&
    typeof e.monto === 'number' &&
    Number.isFinite(e.monto) &&
    (e.tipo === 'credito' || e.tipo === 'debito') &&
    typeof e.mes === 'number' &&
    Number.isInteger(e.mes) &&
    e.mes >= 1 &&
    e.mes <= 12 &&
    typeof e.anio === 'number' &&
    Number.isInteger(e.anio) &&
    e.anio >= 1970 &&
    e.anio <= 9999
  );
}

export function normalizar(e: Entrada): Entrada {
  return {
    ...e,
    visible: e.visible ?? true,
    color: typeof e.color === 'string' && e.color.length > 0 ? e.color : colorPorNombre(e.nombre),
  };
}

export function primerArranque(): boolean {
  return localStorage.getItem(KEY) === null;
}

export function cargarEntradas(): Entrada[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizarColores(parsed.filter(esValida).map(normalizar));
  } catch {
    return [];
  }
}

export function guardarEntradas(entradas: Entrada[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entradas));
  } catch {
    // storage lleno o bloqueado: no romper la app
  }
}

export function exportarJSON(entradas: Entrada[]): void {
  const blob = new Blob([JSON.stringify(entradas, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `deudash-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function importarJSON(archivo: File): Promise<Entrada[]> {
  return archivo.text().then((texto) => {
    const parsed: unknown = JSON.parse(texto);
    if (!Array.isArray(parsed)) throw new Error('El archivo no tiene un formato válido');
    const validas = normalizarColores(parsed.filter(esValida).map(normalizar));
    if (validas.length === 0) throw new Error('No se encontraron entradas válidas en el archivo');
    return validas;
  });
}

export function entradasEjemplo(): Entrada[] {
  const mk = (
    nombre: string,
    monto: number,
    tipo: Entrada['tipo'],
    mes: number,
    anio: number,
    visible = true,
    color?: string
  ): Entrada => ({
    id: uuid(),
    nombre,
    monto,
    tipo,
    mes,
    anio,
    visible,
    color: color ?? colorPorNombre(nombre),
  });

  return [
    mk('Préstamo personal', 250000, 'credito', 1, 2026, true, '#5072e2'),
    mk('Tarjeta Visa', 120000, 'credito', 1, 2026, true, '#e250ca'),
    mk('Préstamo personal', 30000, 'debito', 2, 2026),
    mk('Compra en cuotas', 85000, 'credito', 2, 2026, true, '#b650e2'),
    mk('Tarjeta Visa', 50000, 'debito', 3, 2026),
    mk('Tarjeta Visa', 65000, 'credito', 3, 2026),
    mk('Préstamo personal', 30000, 'debito', 4, 2026),
    mk('Préstamo auto', 400000, 'credito', 5, 2026, true, '#50e2ca'),
    mk('Tarjeta Visa', 45000, 'debito', 6, 2026),
    mk('Gasto médico', 60000, 'credito', 6, 2026, false, '#7250e2'),
    mk('Préstamo personal', 30000, 'debito', 7, 2026),
  ];
}
