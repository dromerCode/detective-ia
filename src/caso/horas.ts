export interface Intervalo {
  desde: string;
  hasta: string;
}

const FORMATO_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function aMinutos(hora: string): number | null {
  const m = FORMATO_HORA.exec(hora);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function minutos(hora: string): number {
  const valor = aMinutos(hora);
  if (valor === null) throw new Error(`Hora inválida: ${hora}`);
  return valor;
}

// Intervalos semiabiertos [desde, hasta)
export function solapan(a: Intervalo, b: Intervalo): boolean {
  return minutos(a.desde) < minutos(b.hasta) && minutos(b.desde) < minutos(a.hasta);
}

export function cubre(a: Intervalo, b: Intervalo): boolean {
  return minutos(a.desde) <= minutos(b.desde) && minutos(b.hasta) <= minutos(a.hasta);
}
