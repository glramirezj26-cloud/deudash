import type { Entrada } from '../types';

export const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const PALETA = [
  // ordenado por tonalidad (hue ascendente)
  '#ef4444', '#fb923c', '#e2c550', '#4ade80', '#50e2ca',
  '#1fb6c1', '#50b6e2', '#1f6bc1', '#5072e2', '#1f1fc1',
  '#7250e2', '#6b1fc1', '#b650e2', '#b61fc1', '#e250ca',
];

export function colorPorNombre(nombre: string): string {
  let h = 0;
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) >>> 0;
  return PALETA[h % PALETA.length]!;
}

export function normalizarColores(entradas: Entrada[]): Entrada[] {
  const porNombre = new Map<string, Entrada[]>();
  for (const e of entradas) {
    const clave = e.nombre.toLowerCase();
    const lista = porNombre.get(clave) ?? [];
    lista.push(e);
    porNombre.set(clave, lista);
  }
  const usados = new Set<string>();
  const asignados = new Map<string, string>();
  const canonicos = new Map<string, string>();
  for (const [clave, lista] of porNombre) {
    const nombre = lista[0]!.nombre;
    const actual = lista.find((e) => PALETA.includes(e.color))?.color;
    let color = actual && !usados.has(actual) ? actual : null;
    if (!color) {
      color = colorPorNombre(nombre);
      if (usados.has(color)) color = PALETA.find((c) => !usados.has(c)) ?? color;
    }
    usados.add(color);
    asignados.set(clave, color);
    canonicos.set(clave, nombre);
  }
  return entradas.map((e) => {
    const clave = e.nombre.toLowerCase();
    return { ...e, nombre: canonicos.get(clave)!, color: asignados.get(clave)! };
  });
}

function signo(e: Entrada): number {
  return e.tipo === 'credito' ? e.monto : -e.monto;
}

export function fmt(n: number): string {
  return '$ ' + Math.round(n).toLocaleString('es-AR');
}

export function fmtFirmado(n: number): string {
  const signo = n > 0 ? '+$ ' : n < 0 ? '-$ ' : '$ ';
  return signo + Math.abs(Math.round(n)).toLocaleString('es-AR');
}

export function parsearMonto(s: string): number | null {
  const limpio = s.trim();
  if (!limpio) return null;
  let n: number;
  if (limpio.includes(',')) {
    n = parseFloat(limpio.replace(/\./g, '').replace(',', '.'));
  } else if (limpio.includes('.')) {
    n = parseFloat(limpio.replace(/\./g, ''));
  } else {
    n = parseFloat(limpio);
  }
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function fmtPct(n: number): string {
  return n.toFixed(1).replace('.', ',') + ' %';
}

export function nombreCorto(nombre: string): string {
  return nombre.length > 12 ? nombre.slice(0, 12) + '.' : nombre;
}

interface FechaMes {
  anio: number;
  mes: number;
}

function sumarMeses(f: FechaMes, n: number): FechaMes {
  const total = f.anio * 12 + (f.mes - 1) + n;
  return { anio: Math.floor(total / 12), mes: ((total % 12) + 12) % 12 + 1 };
}

function primeraEntrada(entradas: Entrada[]): Entrada {
  return entradas.reduce((p, e) => (e.anio < p.anio || (e.anio === p.anio && e.mes < p.mes) ? e : p));
}

export interface PuntoSerie {
  clave: string;
  etiqueta: string;
  saldo: number;
  neto: number;
}

function generarSerie(entradas: Entrada[], desde: FechaMes): PuntoSerie[] {
  const ord = [...entradas].sort((a, b) => a.anio - b.anio || a.mes - b.mes);
  if (ord.length === 0) return [];
  const hasta = ord[ord.length - 1]!;
  const puntos: PuntoSerie[] = [];
  let saldo = 0;
  let idx = 0;
  let cur = { ...desde };

  while (cur.anio < hasta.anio || (cur.anio === hasta.anio && cur.mes <= hasta.mes)) {
    const entradasMes: Entrada[] = [];
    while (idx < ord.length) {
      const actual = ord[idx]!;
      if (actual.anio !== cur.anio || actual.mes !== cur.mes) break;
      entradasMes.push(actual);
      saldo += signo(actual);
      idx++;
    }
    puntos.push({
      clave: `${cur.anio}-${String(cur.mes).padStart(2, '0')}`,
      etiqueta: `${MES_CORTO[cur.mes - 1]} ${String(cur.anio).slice(2)}`,
      saldo,
      neto: entradasMes.reduce((s, e) => s + signo(e), 0),
    });
    cur = sumarMeses(cur, 1);
  }
  return puntos;
}

export function serieTotal(entradas: Entrada[]): PuntoSerie[] {
  if (entradas.length === 0) return [];
  const primero = primeraEntrada(entradas);
  return generarSerie(entradas, sumarMeses({ anio: primero.anio, mes: primero.mes }, -1));
}

export function serieTemporal(entradas: Entrada[]): PuntoSerie[] {
  if (entradas.length === 0) return [];
  const primero = primeraEntrada(entradas);
  return generarSerie(entradas, { anio: primero.anio, mes: primero.mes });
}

export interface SerieDeuda {
  nombre: string;
  color: string;
  puntos: PuntoSerie[];
}

export function seriePorDeuda(entradas: Entrada[]): SerieDeuda[] {
  const porNombre = new Map<string, Entrada[]>();
  for (const e of entradas) {
    const arr = porNombre.get(e.nombre);
    if (arr) arr.push(e);
    else porNombre.set(e.nombre, [e]);
  }

  const deudas: SerieDeuda[] = [];
  for (const [nombre, lista] of porNombre) {
    const primero = primeraEntrada(lista);
    deudas.push({
      nombre,
      color: lista[lista.length - 1]!.color,
      puntos: generarSerie(lista, sumarMeses({ anio: primero.anio, mes: primero.mes }, -1)),
    });
  }
  return deudas;
}

export interface Kpis {
  saldoActual: number;
  totalCredito: number;
  totalDebito: number;
  variacion: number | null;
  variacionMeses: number | null;
  topNombre: string | null;
  topMonto: number;
  cantidad: number;
  pico: number | null;
  picoEtiqueta: string | null;
  porcentajePagado: number | null;
  creditoCount: number;
  debitoCount: number;
  pctRestante: number | null;
  pctBajoPico: number | null;
  saldoPrevio: number | null;
  topPct: number | null;
  desdeEtiqueta: string | null;
}

export interface ResumenMovimientos {
  cantidad: number;
  creditoCount: number;
  debitoCount: number;
  desdeEtiqueta: string | null;
}

export function resumenMovimientos(entradas: Entrada[]): ResumenMovimientos {
  let creditoCount = 0;
  let debitoCount = 0;
  let minFecha = Infinity;
  for (const e of entradas) {
    if (e.tipo === 'credito') creditoCount++;
    else debitoCount++;
    minFecha = Math.min(minFecha, e.anio * 12 + e.mes);
  }
  return {
    cantidad: entradas.length,
    creditoCount,
    debitoCount,
    desdeEtiqueta: Number.isFinite(minFecha) ? etiquetaMes(minFecha) : null,
  };
}

export function kpis(entradas: Entrada[], periodo = 3): Kpis {
  const serie = serieTemporal(entradas);
  const mov = resumenMovimientos(entradas);

  let totalCredito = 0;
  let totalDebito = 0;
  const porNombre = new Map<string, number>();

  for (const e of entradas) {
    if (e.tipo === 'credito') totalCredito += e.monto;
    else totalDebito += e.monto;
    porNombre.set(e.nombre, (porNombre.get(e.nombre) ?? 0) + signo(e));
  }

  let pico: number | null = null;
  let picoEtiqueta: string | null = null;
  for (const p of serie) {
    if (pico === null || p.saldo > pico) {
      pico = p.saldo;
      picoEtiqueta = p.etiqueta;
    }
  }

  const porcentajePagado = totalCredito > 0 ? (totalDebito / totalCredito) * 100 : null;

  let topNombre: string | null = null;
  let topMonto = 0;
  for (const [nombre, total] of porNombre) {
    if (Math.abs(total) > Math.abs(topMonto)) {
      topNombre = nombre;
      topMonto = total;
    }
  }

  let variacion: number | null = null;
  let variacionMeses: number | null = null;
  if (serie.length >= 2) {
    const p = Math.max(1, Math.min(6, periodo));
    const ventana = Math.min(p, serie.length - 1);
    variacion = serie[serie.length - 1]!.saldo - serie[serie.length - 1 - ventana]!.saldo;
    variacionMeses = ventana;
  }

  const saldoActual = serie.length > 0 ? serie[serie.length - 1]!.saldo : 0;

  return {
    saldoActual,
    totalCredito,
    totalDebito,
    variacion,
    variacionMeses,
    topNombre,
    topMonto,
    cantidad: mov.cantidad,
    pico,
    picoEtiqueta,
    porcentajePagado,
    creditoCount: mov.creditoCount,
    debitoCount: mov.debitoCount,
    pctRestante:
      porcentajePagado !== null ? Math.max(0, 100 - porcentajePagado) : null,
    pctBajoPico:
      pico !== null && pico > 0 && saldoActual < pico ? ((saldoActual - pico) / pico) * 100 : null,
    saldoPrevio: variacion !== null ? saldoActual - variacion : null,
    topPct: saldoActual > 0 && topMonto > 0 ? (topMonto / saldoActual) * 100 : null,
    desdeEtiqueta: mov.desdeEtiqueta,
  };
}

export interface ResumenConcepto {
  nombre: string;
  color: string;
  saldo: number;
  totalCredito: number;
  totalDebito: number;
  porciento: number;
  porcentajeRestante: number | null;
  desde: string;
  ultimoMes: string;
  desdeFecha: number;
  ultimoFecha: number;
  mesesActivo: number;
}

function etiquetaMes(fecha: number): string {
  const a = Math.floor((fecha - 1) / 12);
  const m = ((fecha - 1) % 12) + 1;
  return `${MES_CORTO[m - 1]} ${String(a).slice(2)}`;
}

export function resumenPorConcepto(entradas: Entrada[]): ResumenConcepto[] {
  const porNombre = new Map<
    string,
    {
      color: string;
      saldo: number;
      credito: number;
      debito: number;
      desde: number;
      hasta: number;
      meses: Set<number>;
    }
  >();

  for (const e of entradas) {
    const fecha = e.anio * 12 + e.mes;
    const prev = porNombre.get(e.nombre);
    if (prev) {
      prev.saldo += signo(e);
      if (e.tipo === 'credito') prev.credito += e.monto;
      else prev.debito += e.monto;
      prev.color = e.color;
      prev.meses.add(fecha);
      if (fecha < prev.desde) prev.desde = fecha;
      if (fecha > prev.hasta) prev.hasta = fecha;
    } else {
      porNombre.set(e.nombre, {
        color: e.color,
        saldo: signo(e),
        credito: e.tipo === 'credito' ? e.monto : 0,
        debito: e.tipo === 'debito' ? e.monto : 0,
        desde: fecha,
        hasta: fecha,
        meses: new Set([fecha]),
      });
    }
  }

  const lista: ResumenConcepto[] = [...porNombre.entries()].map(([nombre, d]) => ({
    nombre,
    color: d.color,
    saldo: d.saldo,
    totalCredito: d.credito,
    totalDebito: d.debito,
    porciento: 0,
    porcentajeRestante: d.credito > 0 ? (d.saldo / d.credito) * 100 : null,
    desde: etiquetaMes(d.desde),
    ultimoMes: etiquetaMes(d.hasta),
    desdeFecha: d.desde,
    ultimoFecha: d.hasta,
    mesesActivo: d.meses.size,
  }));

  const sumaPositivos = lista.reduce((s, r) => s + (r.saldo > 0 ? r.saldo : 0), 0);
  if (sumaPositivos > 0) {
    for (const r of lista) {
      if (r.saldo > 0) r.porciento = (r.saldo / sumaPositivos) * 100;
    }
  }

  return lista.sort((a, b) => b.saldo - a.saldo);
}
