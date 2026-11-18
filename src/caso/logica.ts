import { cubre, solapan } from "./horas.ts";
import type { Caso, Hecho, Problema } from "./tipos.ts";

export interface Evaluacion {
  descartado: boolean;
  oportunidad: boolean;
  medio: boolean;
  movil: boolean;
}

export function lugaresAbiertos(c: Caso, pistas: Set<string>): Set<string> {
  return new Set(c.lugares.filter((l) => !l.requiere || pistas.has(l.requiere)).map((l) => l.id));
}

// Punto fijo: se abren lugares y testimonios hasta que no aparece nada nuevo
export function pistasAlcanzables(c: Caso, inicial: Set<string> = new Set()): Set<string> {
  const tengo = new Set(inicial);
  let cambio = true;
  while (cambio) {
    cambio = false;
    const abiertos = lugaresAbiertos(c, tengo);
    for (const p of c.pistas) {
      if (tengo.has(p.id)) continue;
      const accesible = p.origen.tipo === "lugar"
        ? abiertos.has(p.origen.lugar)
        : p.origen.requiere.every((r) => tengo.has(r));
      if (accesible) {
        tengo.add(p.id);
        cambio = true;
      }
    }
  }
  return tengo;
}

export function hechosDe(c: Caso, pistas: Iterable<string>): Hecho[] {
  const ids = new Set<string>();
  for (const id of pistas) {
    for (const h of c.pistas.find((p) => p.id === id)?.revela ?? []) ids.add(h);
  }
  return c.hechos.filter((h) => ids.has(h.id));
}

export function evaluar(c: Caso, sospechoso: string, hechos: Hecho[]): Evaluacion {
  const suyos = hechos.filter((h) => h.sujeto === sospechoso);
  const r: Evaluacion = { descartado: false, oportunidad: false, medio: false, movil: false };
  for (const h of suyos) {
    if (h.tipo === "presencia") {
      if (h.lugar !== c.crimen.lugar && cubre(h, c.crimen)) r.descartado = true;
      if (h.lugar === c.crimen.lugar && solapan(h, c.crimen)) r.oportunidad = true;
    } else if (h.tipo === "acceso_arma") {
      if (h.valor) r.medio = true;
      else r.descartado = true;
    } else {
      if (h.valor) r.movil = true;
      else r.descartado = true;
    }
  }
  return r;
}

export function probado(e: Evaluacion): boolean {
  return !e.descartado && e.oportunidad && e.medio && e.movil;
}

export function queFalta(e: Evaluacion): string[] {
  const falta: string[] = [];
  if (!e.oportunidad) falta.push("oportunidad (presencia en el lugar del crimen durante la franja)");
  if (!e.medio) falta.push("medio (acceso al arma)");
  if (!e.movil) falta.push("móvil");
  return falta;
}

export function revisarConsistencia(c: Caso): Problema[] {
  const errores: Problema[] = [];
  const presencias = c.hechos.filter((h) => h.tipo === "presencia");

  for (let i = 0; i < presencias.length; i++) {
    for (let j = i + 1; j < presencias.length; j++) {
      const a = presencias[i]!;
      const b = presencias[j]!;
      if (a.sujeto === b.sujeto && a.lugar !== b.lugar && solapan(a, b)) {
        errores.push({
          codigo: "E_UBICUIDAD",
          mensaje: `"${a.sujeto}" no puede estar a la vez en "${a.lugar}" (${a.id}) y en "${b.lugar}" (${b.id}).`,
        });
      }
    }
  }

  for (const s of c.sospechosos) {
    const choque = presencias.find((h) => h.sujeto === s.id && h.lugar !== s.coartada.lugar && solapan(h, s.coartada));
    if (choque && !s.mienteCoartada) {
      errores.push({
        codigo: "E_COARTADA_NO_MARCADA",
        mensaje: `La coartada de "${s.id}" (${s.coartada.lugar}) choca con el hecho ${choque.id} (${choque.lugar}); marca mienteCoartada: true o corrige la coartada.`,
      });
    }
    if (!choque && s.mienteCoartada) {
      errores.push({
        codigo: "E_MENTIRA_SIN_CHOQUE",
        mensaje: `"${s.id}" tiene mienteCoartada: true pero ningún hecho de presencia contradice su coartada; añade el hecho que la desmiente.`,
      });
    }
  }
  return errores;
}
