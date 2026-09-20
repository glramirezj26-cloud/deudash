import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Entrada, Tipo } from '../types';
import { NOMBRES_MES, PALETA, parsearMonto } from '../lib/calc';

interface Props {
  entradas: Entrada[];
  editando: Entrada | null;
  alGuardar: (datos: Omit<Entrada, 'id' | 'visible'>[]) => void;
  alCancelar: () => void;
}

export default function EntryForm({ entradas, editando, alGuardar, alCancelar }: Props) {
  const hoy = new Date();
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [tipo, setTipo] = useState<Tipo>('credito');
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [color, setColor] = useState<string>(PALETA[0]!);
  const [error, setError] = useState<string | null>(null);
  const [mostrarConceptos, setMostrarConceptos] = useState(false);
  const [hasta, setHasta] = useState<{ mes: number; anio: number } | null>(null);

  useEffect(() => {
    if (editando) {
      setNombre(editando.nombre);
      setMonto(String(editando.monto));
      setTipo(editando.tipo);
      setMes(editando.mes);
      setAnio(editando.anio);
      setColor(editando.color);
      setHasta(null);
      setError(null);
    }
  }, [editando]);

  useEffect(() => {
    const n = nombre.trim().toLowerCase();
    if (!n) return;
    const otras = editando ? entradas.filter((e) => e.id !== editando.id) : entradas;
    const existente = otras.find((e) => e.nombre.toLowerCase() === n);
    if (existente) setColor(existente.color);
  }, [nombre, editando, entradas]);

  const nombreNorm = nombre.trim().toLowerCase();
  const otrasEntradas = editando ? entradas.filter((e) => e.id !== editando.id) : entradas;
  const conceptoExistente = otrasEntradas.find((e) => e.nombre.toLowerCase() === nombreNorm);
  const colorBloqueado = Boolean(conceptoExistente);

  const anios = Array.from(
    new Set([...Array.from({ length: 11 }, (_, i) => hoy.getFullYear() - 8 + i), ...(editando ? [editando.anio] : [])])
  ).sort((a, b) => a - b);

  const claveEditada = editando?.nombre.toLowerCase() ?? '';
  const coloresUsados = new Set(
    entradas
      .filter((e) => e.nombre.toLowerCase() !== claveEditada)
      .map((e) => e.color)
  );
  const usadosPor = (c: string): string | undefined =>
    entradas.find((e) => e.color === c && e.nombre.toLowerCase() !== claveEditada)?.nombre;
  const paletaAgotada = PALETA.every((c) => coloresUsados.has(c));
  const colorDisponible = (c: string) => paletaAgotada || !coloresUsados.has(c);

  const porNombre = new Map<string, { color: string; ultimo: number }>();
  for (const e of entradas) {
    const clave = e.nombre;
    const prev = porNombre.get(clave);
    const fecha = e.anio * 12 + e.mes;
    if (!prev || fecha > prev.ultimo) porNombre.set(clave, { color: e.color, ultimo: fecha });
  }
  const conceptos = [...porNombre.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'es'))
    .map(([nombre, meta]) => ({ nombre, color: meta.color }));

  const elegirConcepto = (nombre: string, color: string) => {
    setNombre(nombre);
    setColor(color);
    setMostrarConceptos(false);
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const m = parsearMonto(monto);
    if (!nombre.trim()) {
      setError('Ingresá un nombre o concepto');
      return;
    }
    if (m === null || m <= 0) {
      setError('El monto debe ser mayor a cero');
      return;
    }
    const nombreFinal = conceptoExistente ? conceptoExistente.nombre : nombre.trim();

    const datos: Omit<Entrada, 'id' | 'visible'>[] = [];
    if (hasta) {
      const desdeTotal = anio * 12 + (mes - 1);
      const hastaTotal = hasta.anio * 12 + (hasta.mes - 1);
      if (hastaTotal < desdeTotal) {
        setError('El mes "hasta" debe ser posterior al de origen');
        return;
      }
      for (let total = desdeTotal; total <= hastaTotal; total++) {
        const a = Math.floor(total / 12);
        const mm = (total % 12) + 1;
        datos.push({ nombre: nombreFinal, monto: m, tipo, mes: mm, anio: a, color });
      }
    } else {
      datos.push({ nombre: nombreFinal, monto: m, tipo, mes, anio, color });
    }

    alGuardar(datos);
    setMostrarConceptos(false);
    setNombre('');
    setMonto('');
    setTipo('credito');
    setColor(PALETA[0]!);
    setHasta(null);
  };

  return (
    <form className="tarjeta" onSubmit={enviar}>
      <h2>{editando ? 'Editar entrada' : 'Cargar entrada'}</h2>

      <div className="campo">
        <label htmlFor="nombre">Nombre / concepto</label>
        <div className="campo-nombre">
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Tarjeta Visa"
          />
          <button
            type="button"
            className="icono toggle-lista"
            title="Conceptos existentes"
            disabled={conceptos.length === 0}
            onClick={() => setMostrarConceptos((v) => !v)}
          >
            ▾
          </button>
          {mostrarConceptos && conceptos.length > 0 && (
            <div className="lista-conceptos">
              {conceptos.map((c) => (
                <button
                  key={c.nombre}
                  type="button"
                  className="item-concepto"
                  onClick={() => elegirConcepto(c.nombre, c.color)}
                >
                  <span className="dot" style={{ background: c.color }}></span>
                  {c.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="campo">
        <label htmlFor="monto">Monto</label>
        <input
          id="monto"
          type="text"
          inputMode="decimal"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="0,00"
        />
        <span className="nota">Decimales con coma y punto para miles (ej: 1.500,75)</span>
      </div>

      <div className="campo">
        <label>Tipo</label>
        <div className="segmento">
          <button
            type="button"
            className={tipo === 'credito' ? 'seleccionado-credito' : ''}
            onClick={() => setTipo('credito')}
          >
            Crédito (debo)
          </button>
          <button
            type="button"
            className={tipo === 'debito' ? 'seleccionado-debito' : ''}
            onClick={() => setTipo('debito')}
          >
            Débito (abono)
          </button>
        </div>
      </div>

      <div className="campo">
        <label>Color</label>
        {colorBloqueado ? (
          <p className="nota">
            <span className="dot" style={{ background: color }}></span>
            Concepto existente: se suma a {conceptoExistente?.nombre} y mantiene su color.
          </p>
        ) : (
          <>
            <div className="paleta">
              {PALETA.map((c) => {
                const disponible = colorDisponible(c);
                const usadoPor = usadosPor(c);
                return (
                  <button
                    key={c}
                    type="button"
                    className={`swatch ${color === c ? 'seleccionado' : ''}`}
                    style={{ background: c }}
                    disabled={!disponible}
                    onClick={() => setColor(c)}
                    title={usadoPor ? `Ya en uso por: ${usadoPor}` : disponible ? 'Elegir color' : 'Color en uso'}
                    aria-label={`Color ${c}`}
                  />
                );
              })}
            </div>
            {paletaAgotada && !coloresUsados.has(color) && (
              <span className="nota">Todos los colores están en uso, se permiten duplicados.</span>
            )}
          </>
        )}
      </div>

      <div className="fila-mes">
        <div className="campo">
          <label htmlFor="mes">Mes</label>
          <select id="mes" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
            {NOMBRES_MES.map((n, i) => (
              <option key={n} value={i + 1}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="anio">Año</label>
          <select id="anio" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
            {anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!editando && (
        <label className="check-repetir">
          <input
            type="checkbox"
            checked={hasta !== null}
            onChange={(e) =>
              e.target.checked
                ? setHasta(mes === 12 ? { mes: 1, anio: anio + 1 } : { mes: mes + 1, anio })
                : setHasta(null)
            }
          />
          Repetir hasta
        </label>
      )}

      {hasta !== null && (
        <div className="fila-mes">
          <div className="campo">
            <label htmlFor="hasta-mes">Hasta mes</label>
            <select
              id="hasta-mes"
              value={hasta.mes}
              onChange={(e) => setHasta({ ...hasta, mes: Number(e.target.value) })}
            >
              {NOMBRES_MES.map((n, i) => (
                <option key={n} value={i + 1}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="hasta-anio">Hasta año</label>
            <select
              id="hasta-anio"
              value={hasta.anio}
              onChange={(e) => setHasta({ ...hasta, anio: Number(e.target.value) })}
            >
              {anios.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      <div className="botones-form">
        <button type="submit" className="primario">
          {editando ? 'Guardar cambios' : 'Agregar'}
        </button>
        {editando && (
          <button type="button" onClick={alCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
