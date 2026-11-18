import { esConfesion } from "../servidor/filtro.ts";
import { validarEstructura } from "./estructura.ts";
import { evaluar, hechosDe, pistasAlcanzables, probado, queFalta, revisarConsistencia } from "./logica.ts";
import type { Caso, Informe, Problema } from "./tipos.ts";

const PALABRAS_SPOILER = /culpable|asesin|mat[oó]|lo hizo/i;
const PALABRAS_CRIMEN = /envenen|asesin|\bmatar|\bmat[oó]\b|\bcrimen\b/i;

function revisarAlcance(c: Caso, alcanzables: Set<string>, errores: Problema[], avisos: Problema[]): void {
  const clave = new Set(c.solucion.pruebasClave);
  for (const p of c.pistas) {
    if (alcanzables.has(p.id)) continue;
    if (clave.has(p.id)) {
      errores.push({ codigo: "E_PISTA_INALCANZABLE", mensaje: `La prueba clave ${p.id} no se puede conseguir: revisa qué lugar o testimonio la bloquea.` });
    } else {
      avisos.push({ codigo: "A_PISTA_INALCANZABLE", mensaje: `La pista ${p.id} no se puede conseguir nunca.` });
    }
  }
}

function revisarSolucion(c: Caso, alcanzables: Set<string>, errores: Problema[]): void {
  const hechos = hechosDe(c, alcanzables);
  const culpable = c.solucion.culpable;
  const vivos = c.sospechosos.filter((s) => !evaluar(c, s.id, hechos).descartado).map((s) => s.id);
  const evCulpable = evaluar(c, culpable, hechos);

  if (evCulpable.descartado) {
    errores.push({ codigo: "E_CULPABLE_DESCARTADO", mensaje: `Las pistas descartan al culpable "${culpable}" (coartada probada, sin acceso al arma o sin móvil).` });
  }
  const inocentesVivos = vivos.filter((id) => id !== culpable);
  if (inocentesVivos.length > 0) {
    errores.push({
      codigo: "E_SOLUCION_NO_UNICA",
      mensaje: `Ninguna pista descarta a: ${inocentesVivos.join(", ")}. Cada inocente necesita una coartada probada, falta de acceso al arma o falta de móvil.`,
    });
  }
  if (!evCulpable.descartado && !probado(evCulpable)) {
    errores.push({ codigo: "E_CULPABLE_NO_PROBADO", mensaje: `Las pistas no prueban contra "${culpable}": falta ${queFalta(evCulpable).join(", ")}.` });
  }
}

function revisarPruebasClave(c: Caso, errores: Problema[]): void {
  const clave = c.solucion.pruebasClave;
  const culpable = c.solucion.culpable;
  const ev = evaluar(c, culpable, hechosDe(c, clave));
  if (!probado(ev)) {
    errores.push({ codigo: "E_PRUEBAS_INSUFICIENTES", mensaje: `Las pruebas clave no bastan contra "${culpable}": falta ${queFalta(ev).join(", ")}.` });
    return;
  }
  for (const p of clave) {
    if (probado(evaluar(c, culpable, hechosDe(c, clave.filter((x) => x !== p))))) {
      errores.push({ codigo: "E_PRUEBA_DECORATIVA", mensaje: `La prueba clave ${p} sobra: sin ella el culpable sigue probado. Quítala de pruebasClave.` });
    }
  }
}

function revisarSpoilers(c: Caso, errores: Problema[]): void {
  const culpable = c.sospechosos.find((s) => s.id === c.solucion.culpable);
  if (!culpable) return;
  const nombres = [culpable.nombre, culpable.nombre.split(" ")[0] ?? culpable.nombre].map((n) => n.toLowerCase());
  const publicos: [string, string][] = [
    ["titulo", c.titulo],
    ["introduccion", c.introduccion],
    ...c.lugares.map((l): [string, string] => [`lugar ${l.id}`, l.descripcion]),
    ...c.sospechosos.map((s): [string, string] => [`perfil de ${s.id}`, s.perfil]),
  ];
  for (const [donde, texto] of publicos) {
    const t = texto.toLowerCase();
    if (nombres.some((n) => t.includes(n)) && PALABRAS_SPOILER.test(texto)) {
      errores.push({ codigo: "E_SPOILER", mensaje: `El texto público "${donde}" delata al culpable. Reescríbelo sin señalarle.` });
    }
  }
}

function revisarTestimoniosYSecretos(c: Caso, errores: Problema[], avisos: Problema[]): void {
  for (const p of c.pistas) {
    const origen = p.origen;
    if (origen.tipo !== "testimonio") continue;
    if (origen.requiere.length === 0) {
      errores.push({ codigo: "E_TESTIMONIO_SIN_REQUISITOS", mensaje: `El testimonio ${p.id} no requiere ninguna pista: en el juego sólo se consigue al presentar una, así que nunca saldría.` });
    }
    const contraSiMismo = p.revela.some((id) => c.hechos.find((h) => h.id === id)?.sujeto === origen.sospechoso);
    if (origen.sospechoso === c.solucion.culpable && contraSiMismo) {
      errores.push({ codigo: "E_TESTIMONIO_CULPABLE", mensaje: `El testimonio ${p.id} lo da el culpable contra sí mismo, pero el culpable nunca confiesa. Haz que lo cuente otro sospechoso.` });
    }
  }
  for (const s of c.sospechosos) {
    if (PALABRAS_CRIMEN.test(s.secreto)) {
      errores.push({ codigo: "E_SECRETO_CRIMEN", mensaje: `El secreto de "${s.id}" habla del crimen. El secreto tiene que ser otra cosa que oculta, una pista falsa.` });
    }
  }
  if (c.lugares.every((l) => !l.requiere)) {
    avisos.push({ codigo: "A_SIN_LUGAR_CERRADO", mensaje: "Ningún lugar está cerrado: el jugador puede verlo todo desde el principio." });
  }
}

const TITULOS = new Set(["don", "doña", "doctor", "doctora", "capitán", "capitana", "condesa", "conde", "señor", "señora", "padre", "madre", "sor"]);

function nombresPropios(nombre: string): string[] {
  return nombre.replace(/["'«»]/g, " ").split(/\s+/).filter((t) => t.length > 2 && t === t[0]?.toUpperCase() + t.slice(1) && !TITULOS.has(t.toLowerCase()));
}

// La frase de reserva sale sin pasar por filtros: no puede soltar nada de lo que el NPC guarda
function revisarReservas(c: Caso, errores: Problema[]): void {
  for (const s of c.sospechosos) {
    const palabras = s.respuestaReserva.split(/[^\p{L}]+/u);
    const nombra = c.sospechosos.filter((o) => o.id !== s.id).find((o) => nombresPropios(o.nombre).some((n) => palabras.includes(n)));
    if (nombra || esConfesion(s.respuestaReserva)) {
      const motivo = nombra ? `nombra a "${nombra.id}"` : "es una confesión";
      errores.push({ codigo: "E_RESERVA_DELATA", mensaje: `La frase de reserva de "${s.id}" ${motivo}. Tiene que ser una frase neutra sobre quien la dice.` });
    }
  }
}

function revisarHechosSinPista(c: Caso, avisos: Problema[]): void {
  const revelados = new Set(c.pistas.flatMap((p) => p.revela));
  for (const h of c.hechos) {
    if (!revelados.has(h.id)) avisos.push({ codigo: "A_HECHO_SIN_PISTA", mensaje: `Ninguna pista revela el hecho ${h.id}.` });
  }
}

export function verificarCaso(datos: unknown): Informe {
  const { caso, errores } = validarEstructura(datos);
  const avisos: Problema[] = [];
  if (!caso) return { valido: false, errores, avisos };

  const alcanzables = pistasAlcanzables(caso);
  revisarAlcance(caso, alcanzables, errores, avisos);
  errores.push(...revisarConsistencia(caso));
  revisarSolucion(caso, alcanzables, errores);
  revisarPruebasClave(caso, errores);
  revisarSpoilers(caso, errores);
  revisarTestimoniosYSecretos(caso, errores, avisos);
  revisarReservas(caso, errores);
  revisarHechosSinPista(caso, avisos);
  return { valido: errores.length === 0, errores, avisos };
}
