import { lugaresAbiertos } from "../caso/logica.ts";
import type { Caso, Pista } from "../caso/tipos.ts";
import type { Mensaje } from "../servidor/proveedores.ts";

export interface Partida {
  id: string;
  caso: Caso;
  pistas: Set<string>;
  explorados: Set<string>;
  preguntas: number;
  terminada: boolean;
  historial: Map<string, Mensaje[]>;
}

export class ErrorJuego extends Error {
  readonly estado: number;

  constructor(estado: number, mensaje: string) {
    super(mensaje);
    this.estado = estado;
  }
}

export interface EstadoPublico {
  partidaId: string;
  caso: { id: string; titulo: string; ambientacion: string; introduccion: string; victima: string; arma: string; lugarCrimen: string; franja: string };
  lugares: { id: string; nombre: string; abierto: boolean; explorado: boolean; descripcion?: string }[];
  sospechosos: { id: string; nombre: string; perfil: string }[];
  cuaderno: { id: string; nombre: string; texto: string }[];
  preguntas: number;
  terminada: boolean;
}

export interface ResultadoAcusacion {
  acierto: boolean;
  puntuacion: number;
  explicacion: string;
}

export function crearPartida(caso: Caso, id: string): Partida {
  return { id, caso, pistas: new Set(), explorados: new Set(), preguntas: 0, terminada: false, historial: new Map() };
}

function exigirEnJuego(p: Partida): void {
  if (p.terminada) throw new ErrorJuego(409, "La partida ya ha terminado.");
}

export function explorar(p: Partida, lugarId: string): Pista[] {
  exigirEnJuego(p);
  const lugar = p.caso.lugares.find((l) => l.id === lugarId);
  if (!lugar) throw new ErrorJuego(404, "Ese lugar no existe.");
  if (!lugaresAbiertos(p.caso, p.pistas).has(lugarId)) throw new ErrorJuego(403, `${lugar.nombre} está cerrado. Te falta algo para entrar.`);
  p.explorados.add(lugarId);
  const nuevas = p.caso.pistas.filter((x) => x.origen.tipo === "lugar" && x.origen.lugar === lugarId && !p.pistas.has(x.id));
  for (const x of nuevas) p.pistas.add(x.id);
  return nuevas;
}

export function prepararInterrogatorio(p: Partida, sospechosoId: string, pistaPresentada?: string): { testimonio: Pista | null } {
  exigirEnJuego(p);
  if (!p.caso.sospechosos.some((s) => s.id === sospechosoId)) throw new ErrorJuego(404, "Ese sospechoso no existe.");
  if (pistaPresentada !== undefined && !p.pistas.has(pistaPresentada)) throw new ErrorJuego(400, "No tienes esa pista en el cuaderno.");
  p.preguntas++;
  if (pistaPresentada === undefined) return { testimonio: null };
  const testimonio = p.caso.pistas.find((x) =>
    x.origen.tipo === "testimonio" &&
    x.origen.sospechoso === sospechosoId &&
    x.origen.requiere.includes(pistaPresentada) &&
    x.origen.requiere.every((r) => p.pistas.has(r)) &&
    !p.pistas.has(x.id)) ?? null;
  if (testimonio) p.pistas.add(testimonio.id);
  return { testimonio };
}

export function acusar(p: Partida, culpable: string, pruebas: string[]): ResultadoAcusacion {
  exigirEnJuego(p);
  if (!p.caso.sospechosos.some((s) => s.id === culpable)) throw new ErrorJuego(400, "Ese sospechoso no existe.");
  if (pruebas.some((x) => !p.pistas.has(x))) throw new ErrorJuego(400, "Sólo puedes presentar pistas de tu cuaderno.");
  p.terminada = true;
  const { solucion } = p.caso;
  if (culpable !== solucion.culpable) return { acierto: false, puntuacion: 0, explicacion: solucion.explicacion };
  const unicas = [...new Set(pruebas)];
  const clave = unicas.filter((x) => solucion.pruebasClave.includes(x)).length;
  const puntuacion = 1000 + 200 * clave - 100 * (unicas.length - clave) - 10 * p.preguntas;
  return { acierto: true, puntuacion: Math.max(0, puntuacion), explicacion: solucion.explicacion };
}

export function estadoPublico(p: Partida): EstadoPublico {
  const c = p.caso;
  const abiertos = lugaresAbiertos(c, p.pistas);
  const lugarCrimen = c.lugares.find((l) => l.id === c.crimen.lugar)?.nombre ?? c.crimen.lugar;
  return {
    partidaId: p.id,
    caso: { id: c.id, titulo: c.titulo, ambientacion: c.ambientacion, introduccion: c.introduccion, victima: c.crimen.victima, arma: c.crimen.arma, lugarCrimen, franja: `${c.crimen.desde}–${c.crimen.hasta}` },
    lugares: c.lugares.map((l) => {
      const abierto = abiertos.has(l.id);
      return abierto
        ? { id: l.id, nombre: l.nombre, abierto, explorado: p.explorados.has(l.id), descripcion: l.descripcion }
        : { id: l.id, nombre: l.nombre, abierto, explorado: false };
    }),
    sospechosos: c.sospechosos.map((s) => ({ id: s.id, nombre: s.nombre, perfil: s.perfil })),
    cuaderno: c.pistas.filter((x) => p.pistas.has(x.id)).map((x) => ({ id: x.id, nombre: x.nombre, texto: x.texto })),
    preguntas: p.preguntas,
    terminada: p.terminada,
  };
}
