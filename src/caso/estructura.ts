import { aMinutos } from "./horas.ts";
import type { Caso, Problema } from "./tipos.ts";

type Objeto = Record<string, unknown>;

const DIFICULTADES = ["facil", "media", "dificil"];

function esObjeto(v: unknown): v is Objeto {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function esTexto(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

class Revisor {
  errores: Problema[] = [];

  error(codigo: string, mensaje: string): void {
    this.errores.push({ codigo, mensaje });
  }

  objeto(v: unknown, donde: string): Objeto | null {
    if (esObjeto(v)) return v;
    this.error("E_ESTRUCTURA", `${donde} debe ser un objeto.`);
    return null;
  }

  texto(o: Objeto, campo: string, donde: string): void {
    if (!esTexto(o[campo])) this.error("E_ESTRUCTURA", `${donde}.${campo} debe ser un texto no vacío.`);
  }

  booleano(o: Objeto, campo: string, donde: string): void {
    if (typeof o[campo] !== "boolean") this.error("E_ESTRUCTURA", `${donde}.${campo} debe ser true o false.`);
  }

  listaTextos(o: Objeto, campo: string, donde: string): void {
    const v = o[campo];
    if (!Array.isArray(v) || !v.every(esTexto)) {
      this.error("E_ESTRUCTURA", `${donde}.${campo} debe ser una lista de textos.`);
    }
  }

  lista(o: Objeto, campo: string, donde: string): unknown[] {
    const v = o[campo];
    if (Array.isArray(v)) return v;
    this.error("E_ESTRUCTURA", `${donde}.${campo} debe ser una lista.`);
    return [];
  }

  franja(o: Objeto, donde: string): void {
    this.texto(o, "desde", donde);
    this.texto(o, "hasta", donde);
    const desde = typeof o.desde === "string" ? aMinutos(o.desde) : null;
    const hasta = typeof o.hasta === "string" ? aMinutos(o.hasta) : null;
    if (desde === null || hasta === null) {
      this.error("E_HORA", `${donde}: las horas deben tener formato HH:MM (00:00 a 23:59).`);
    } else if (desde >= hasta) {
      this.error("E_HORA", `${donde}: "desde" (${String(o.desde)}) debe ser anterior a "hasta" (${String(o.hasta)}).`);
    }
  }
}

function revisarForma(r: Revisor, raiz: Objeto): void {
  for (const campo of ["id", "titulo", "ambientacion", "introduccion"]) r.texto(raiz, campo, "caso");
  if (!DIFICULTADES.includes(raiz.dificultad as string)) {
    r.error("E_ESTRUCTURA", "caso.dificultad debe ser facil, media o dificil.");
  }

  const crimen = r.objeto(raiz.crimen, "caso.crimen");
  if (crimen) {
    for (const campo of ["victima", "lugar", "arma"]) r.texto(crimen, campo, "crimen");
    r.franja(crimen, "crimen");
  }

  r.lista(raiz, "lugares", "caso").forEach((v, i) => {
    const l = r.objeto(v, `lugares[${i}]`);
    if (!l) return;
    for (const campo of ["id", "nombre", "descripcion"]) r.texto(l, campo, `lugares[${i}]`);
    if (l.requiere !== undefined) r.texto(l, "requiere", `lugares[${i}]`);
  });

  r.lista(raiz, "sospechosos", "caso").forEach((v, i) => {
    const donde = `sospechosos[${i}]`;
    const s = r.objeto(v, donde);
    if (!s) return;
    for (const campo of ["id", "nombre", "perfil", "personalidad", "secreto", "respuestaReserva"]) r.texto(s, campo, donde);
    r.booleano(s, "mienteCoartada", donde);
    r.listaTextos(s, "conoce", donde);
    const c = r.objeto(s.coartada, `${donde}.coartada`);
    if (c) {
      r.texto(c, "lugar", `${donde}.coartada`);
      r.franja(c, `${donde}.coartada`);
      if (c.testigo !== undefined) r.texto(c, "testigo", `${donde}.coartada`);
    }
  });

  r.lista(raiz, "hechos", "caso").forEach((v, i) => {
    const donde = `hechos[${i}]`;
    const h = r.objeto(v, donde);
    if (!h) return;
    r.texto(h, "id", donde);
    r.texto(h, "sujeto", donde);
    if (h.tipo === "presencia") {
      r.texto(h, "lugar", donde);
      r.franja(h, donde);
    } else if (h.tipo === "acceso_arma") {
      r.booleano(h, "valor", donde);
    } else if (h.tipo === "movil") {
      r.booleano(h, "valor", donde);
      r.texto(h, "descripcion", donde);
    } else {
      r.error("E_ESTRUCTURA", `${donde}.tipo debe ser presencia, acceso_arma o movil.`);
    }
  });

  r.lista(raiz, "pistas", "caso").forEach((v, i) => {
    const donde = `pistas[${i}]`;
    const p = r.objeto(v, donde);
    if (!p) return;
    for (const campo of ["id", "nombre", "texto"]) r.texto(p, campo, donde);
    const revela = p.revela;
    if (!Array.isArray(revela) || !revela.every(esTexto)) {
      r.error("E_ESTRUCTURA", `${donde}.revela debe ser una lista de ids de hechos (puede estar vacía).`);
    }
    const o = r.objeto(p.origen, `${donde}.origen`);
    if (!o) return;
    if (o.tipo === "lugar") {
      r.texto(o, "lugar", `${donde}.origen`);
    } else if (o.tipo === "testimonio") {
      r.texto(o, "sospechoso", `${donde}.origen`);
      r.listaTextos(o, "requiere", `${donde}.origen`);
    } else {
      r.error("E_ESTRUCTURA", `${donde}.origen.tipo debe ser lugar o testimonio.`);
    }
  });

  const sol = r.objeto(raiz.solucion, "caso.solucion");
  if (sol) {
    r.texto(sol, "culpable", "solucion");
    r.texto(sol, "explicacion", "solucion");
    r.listaTextos(sol, "pruebasClave", "solucion");
  }
}

function revisarIds(r: Revisor, c: Caso): void {
  const vistos = new Set<string>();
  const todos = [...c.lugares, ...c.sospechosos, ...c.hechos, ...c.pistas].map((x) => x.id);
  for (const id of todos) {
    if (vistos.has(id)) r.error("E_ID_DUPLICADO", `El id "${id}" está repetido; cada lugar, sospechoso, hecho y pista necesita un id único.`);
    vistos.add(id);
  }
}

function revisarReferencias(r: Revisor, c: Caso): void {
  const lugares = new Set(c.lugares.map((l) => l.id));
  const sospechosos = new Set(c.sospechosos.map((s) => s.id));
  const hechos = new Set(c.hechos.map((h) => h.id));
  const pistas = new Set(c.pistas.map((p) => p.id));

  const exigir = (conjunto: Set<string>, id: string, que: string, donde: string): void => {
    if (!conjunto.has(id)) r.error("E_REFERENCIA", `${donde}: ${que} "${id}" no existe.`);
  };

  exigir(lugares, c.crimen.lugar, "el lugar", "crimen");
  for (const l of c.lugares) if (l.requiere) exigir(pistas, l.requiere, "la pista requerida", `lugar ${l.id}`);
  for (const s of c.sospechosos) {
    exigir(lugares, s.coartada.lugar, "el lugar de la coartada", `sospechoso ${s.id}`);
    if (s.coartada.testigo) exigir(sospechosos, s.coartada.testigo, "el testigo", `sospechoso ${s.id}`);
    for (const h of s.conoce) exigir(hechos, h, "el hecho", `sospechoso ${s.id} (conoce)`);
  }
  for (const h of c.hechos) {
    exigir(sospechosos, h.sujeto, "el sospechoso", `hecho ${h.id}`);
    if (h.tipo === "presencia") exigir(lugares, h.lugar, "el lugar", `hecho ${h.id}`);
  }
  for (const p of c.pistas) {
    for (const h of p.revela) exigir(hechos, h, "el hecho", `pista ${p.id} (revela)`);
    if (p.origen.tipo === "lugar") {
      exigir(lugares, p.origen.lugar, "el lugar", `pista ${p.id}`);
    } else {
      exigir(sospechosos, p.origen.sospechoso, "el sospechoso", `pista ${p.id}`);
      for (const req of p.origen.requiere) exigir(pistas, req, "la pista requerida", `pista ${p.id}`);
      if (p.origen.requiere.includes(p.id)) r.error("E_REFERENCIA", `pista ${p.id}: un testimonio no puede requerirse a sí mismo.`);
    }
  }
  exigir(sospechosos, c.solucion.culpable, "el culpable", "solucion");
  for (const p of c.solucion.pruebasClave) exigir(pistas, p, "la prueba clave", "solucion");
}

export function validarEstructura(datos: unknown): { caso: Caso | null; errores: Problema[] } {
  const r = new Revisor();
  const raiz = r.objeto(datos, "El caso");
  if (!raiz) return { caso: null, errores: r.errores };
  revisarForma(r, raiz);
  // Con horas o formas inválidas no se puede razonar sobre referencias ni lógica
  if (r.errores.length > 0) return { caso: null, errores: r.errores };
  const caso = raiz as unknown as Caso;
  revisarIds(r, caso);
  revisarReferencias(r, caso);
  return { caso: r.errores.length === 0 ? caso : null, errores: r.errores };
}
