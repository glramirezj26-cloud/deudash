export type Tipo = 'credito' | 'debito';

export interface Entrada {
  id: string;
  nombre: string;
  monto: number;
  tipo: Tipo;
  mes: number;
  anio: number;
  visible: boolean;
  color: string;
}
