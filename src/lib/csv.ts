import type { Entrada } from '../types';
import { esValida, normalizar, uuid } from './store';
import { normalizarColores, parsearMonto } from './calc';

function celdaCsv(valor: string): string {
  if (/[";\n\r]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`;
  return valor;
}

export function exportarCSV(entradas: Entrada[]): void {
  const filas = [
    ['id', 'nombre', 'monto', 'tipo', 'mes', 'anio', 'visible', 'color'].join(';'),
    ...entradas.map((e) =>
      [
        e.id,
        e.nombre,
        String(Math.round(e.monto)),
        e.tipo,
        String(e.mes),
        String(e.anio),
        String(e.visible),
        e.color,
      ]
        .map(celdaCsv)
        .join(';')
    ),
  ];
  const blob = new Blob(['\uFEFF' + filas.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `deudash-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function dividir(linea: string, sep: string): string[] {
  const celdas: string[] = [];
  let actual = '';
  let entreComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i];
    if (entreComillas) {
      if (ch === '"') {
        if (linea[i + 1] === '"') {
          actual += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        actual += ch;
      }
    } else if (ch === '"') {
      entreComillas = true;
    } else if (ch === sep) {
      celdas.push(actual);
      actual = '';
    } else {
      actual += ch;
    }
  }
  celdas.push(actual);
  return celdas;
}

export function importarCSV(archivo: File): Promise<Entrada[]> {
  return archivo.text().then((texto) => {
    const lineas = texto.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lineas.length < 2) throw new Error('El archivo no tiene un formato válido');

    const sep = lineas[1]!.includes(';') ? ';' : ',';
    const header = dividir(lineas[0]!, sep).map((h) => h.trim().toLowerCase());
    const indiceDe = (nombre: string) => header.indexOf(nombre);

    const validas: Entrada[] = [];
    for (let i = 1; i < lineas.length; i++) {
      const celdas = dividir(lineas[i]!, sep);
      const tomar = (nombre: string): string | undefined => {
        const j = indiceDe(nombre);
        return j >= 0 && j < celdas.length ? celdas[j]?.trim() : undefined;
      };

      const nombre = tomar('nombre');
      if (!nombre) continue;

      const tipoRaw = (tomar('tipo') ?? '').toLowerCase();
      const tipo =
        tipoRaw === 'debito' || tipoRaw === 'débito'
          ? 'debito'
          : tipoRaw === 'credito' || tipoRaw === 'crédito'
            ? 'credito'
            : null;
      if (!tipo) continue;

      const monto = parsearMonto(tomar('monto') ?? '');
      if (monto === null || monto <= 0) continue;

      const mes = Number(tomar('mes'));
      const anio = Number(tomar('anio'));
      if (!Number.isInteger(mes) || mes < 1 || mes > 12) continue;
      if (!Number.isInteger(anio) || anio < 1970) continue;

      const visRaw = (tomar('visible') ?? '').toLowerCase();
      const visible = !(visRaw === 'false' || visRaw === '0');

      const candidata: Entrada = {
        id: uuid(),
        nombre,
        monto,
        tipo,
        mes,
        anio,
        visible,
        color: tomar('color') ?? '',
      };
      if (!esValida(candidata)) continue;
      validas.push(normalizar(candidata));
    }
    if (validas.length === 0) throw new Error('No se encontraron entradas válidas en el archivo');
    return normalizarColores(validas);
  });
}
