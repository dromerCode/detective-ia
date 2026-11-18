const FIN = "(?![a-záéíóúñ])";
const CONFESIONES = [
  /\bfui yo\b(?!\s+(quien|el que|la que)\b(?!.*(mat|lo hizo|envenen|comet)))/,
  /\bhe sido yo\b(?!\s+de\b)(?!\s+(quien|el que|la que)\b(?!.*(mat|lo hizo|envenen|comet)))/,
  new RegExp(`\\b(lo|la|le) mat[eé]${FIN}`),
  new RegExp(`\\byo mat[eé]${FIN}`),
  /\b(lo|la|le) he matado\b/,
  new RegExp(`\\b(lo|la|le) envenen[eé]${FIN}`),
  new RegExp(`\\b(comet[ií]|t[uú] cometiste) el (crimen|asesinato)${FIN}`),
  /\bsoy (el|la) (culpable|asesin[oa])\b/,
  /\bconfieso\b/,
  /\byo lo hice\b/,
  /\blo hice yo\b/,
];

const NEGACION = /\b(no|nunca|jam[aá]s|dicen que|dice que|creen? que|piensan? que)\b/;

// Mira cláusula a cláusula: lo que va entre ¿? y lo negado justo antes no es una confesión
export function esConfesion(texto: string): boolean {
  const sinPreguntas = texto.toLowerCase().replace(/¿[^?]*\?/g, " ").replace(/[^.!…:;?]*\?/g, " ");
  return sinPreguntas.split(/[.!…:;,]+/).some((clausula) =>
    CONFESIONES.some((patron) => {
      const m = patron.exec(clausula);
      return m !== null && !NEGACION.test(clausula.slice(0, m.index));
    }));
}

const FUERA_DE_PERSONAJE = [
  /c[oó]mo puedo ayudar/,
  /en qu[eé] puedo ayudar/,
  /no puedo (cumplir|hacer eso|ayudar|proporcionar|ofrecer)/,
  /como personaje\b/,
  /inteligencia artificial/,
  /\bmodelo de lenguaje\b/,
  /\bcomo (una )?ia\b/,
  /\bsoy una ia\b/,
  /\b(mi|mis|la|las|tus) instrucci[oó]n(es)?\b/,
  /\bnovela de misterio\b/,
  /\bmi personaje\b/,
  /\b(tu|mi) papel\b/,
  /\bestoy representando\b/,
  /\bficticia\b/,
  /\bcomo (detective|jugador)\b/,
  /\bparte del juego\b/,
  /\bla trama\b/,
  /\b(eres|es) una ia\b/,
  /\bprompt\b/,
  /\bmi secreto\b/,
  /\bmi rol\b/,
  /\bel papel que\b/,
  /\bmi juego\b/,
  /\bla soluci[oó]n del caso\b/,
];

export function rompePersonaje(texto: string): boolean {
  const t = texto.toLowerCase();
  return FUERA_DE_PERSONAJE.some((patron) => patron.test(t));
}
