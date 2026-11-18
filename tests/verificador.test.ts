import { test } from "node:test";
import assert from "node:assert/strict";
import { verificarCaso } from "../src/caso/verificador.ts";
import type { Caso, Problema } from "../src/caso/tipos.ts";
import { casoValido, romper } from "./casos-rotos.ts";

function error(c: unknown, codigo: string): Problema | undefined {
  return verificarCaso(c).errores.find((e) => e.codigo === codigo);
}

function pista(c: Caso, id: string): Caso["pistas"][number] {
  const p = c.pistas.find((x) => x.id === id);
  if (!p) throw new Error(`falta ${id}`);
  return p;
}

function sospechoso(c: Caso, id: string): Caso["sospechosos"][number] {
  const s = c.sospechosos.find((x) => x.id === id);
  if (!s) throw new Error(`falta ${id}`);
  return s;
}

function lugar(c: Caso, id: string): Caso["lugares"][number] {
  const l = c.lugares.find((x) => x.id === id);
  if (!l) throw new Error(`falta ${id}`);
  return l;
}

test("el caso de referencia es válido", () => {
  const i = verificarCaso(casoValido());
  assert.equal(i.valido, true, JSON.stringify(i.errores));
  assert.deepEqual(i.errores, []);
});

test("errores de estructura hacen el informe inválido sin lanzar", () => {
  const i = verificarCaso({ titulo: 3 });
  assert.equal(i.valido, false);
  assert.ok(i.errores.length > 0);
});

test("lugar que requiere una pista que está dentro de él deja la prueba clave inalcanzable", () => {
  const c = romper((c) => { lugar(c, "bodega").requiere = "p-barro-bodega"; });
  const e = error(c, "E_PISTA_INALCANZABLE");
  assert.ok(e);
  assert.match(e.mensaje, /p-testimonio-ramon/);
});

test("dos lugares que se requieren mutuamente bloquean sus pistas", () => {
  const c = romper((c) => {
    lugar(c, "despacho").requiere = "p-copia-llave";
    lugar(c, "cuarto-invitados").requiere = "p-pagares";
  });
  const e = error(c, "E_PISTA_INALCANZABLE");
  assert.ok(e);
  assert.match(e.mensaje, /p-pagares/);
});

test("una persona en dos sitios a la vez da E_UBICUIDAD", () => {
  const c = romper((c) => {
    c.hechos.push({ id: "h-x", tipo: "presencia", sujeto: "enrique", lugar: "cocina", desde: "22:10", hasta: "22:20" });
  });
  assert.ok(error(c, "E_UBICUIDAD"));
});

test("coartada contradicha sin marcar como mentira da E_COARTADA_NO_MARCADA", () => {
  assert.ok(error(romper((c) => { sospechoso(c, "enrique").mienteCoartada = false; }), "E_COARTADA_NO_MARCADA"));
});

test("mentira marcada sin ningún hecho que la contradiga da E_MENTIRA_SIN_CHOQUE", () => {
  assert.ok(error(romper((c) => { sospechoso(c, "carmen").mienteCoartada = true; }), "E_MENTIRA_SIN_CHOQUE"));
});

test("un inocente puede mentir si está marcado y hay choque", () => {
  const c = romper((c) => {
    const l = sospechoso(c, "lucia");
    l.coartada.lugar = "salon";
    l.mienteCoartada = true;
  });
  const i = verificarCaso(c);
  assert.equal(i.valido, true, JSON.stringify(i.errores));
});

test("si no se puede descartar a un inocente da E_SOLUCION_NO_UNICA y lo nombra", () => {
  const c = romper((c) => { pista(c, "p-testamento").revela = []; });
  const e = error(c, "E_SOLUCION_NO_UNICA");
  assert.ok(e);
  assert.match(e.mensaje, /carmen/);
});

test("culpable que las pistas descartan da E_CULPABLE_DESCARTADO", () => {
  assert.ok(error(romper((c) => { c.solucion.culpable = "lucia"; }), "E_CULPABLE_DESCARTADO"));
});

test("culpable sin móvil probado da E_CULPABLE_NO_PROBADO y dice qué falta", () => {
  const e = error(romper((c) => { pista(c, "p-pagares").revela = []; }), "E_CULPABLE_NO_PROBADO");
  assert.ok(e);
  assert.match(e.mensaje, /móvil/);
});

test("pruebas clave que no bastan dan E_PRUEBAS_INSUFICIENTES", () => {
  const c = romper((c) => { c.solucion.pruebasClave = ["p-testimonio-ramon", "p-copia-llave"]; });
  assert.ok(error(c, "E_PRUEBAS_INSUFICIENTES"));
});

test("prueba clave que sobra da E_PRUEBA_DECORATIVA", () => {
  const c = romper((c) => { c.solucion.pruebasClave.push("p-nota-cocinera"); });
  const e = error(c, "E_PRUEBA_DECORATIVA");
  assert.ok(e);
  assert.match(e.mensaje, /p-nota-cocinera/);
});

test("nombrar al culpable como asesino en un texto público da E_SPOILER", () => {
  assert.ok(error(romper((c) => { c.introduccion = "Enrique Vílchez es el asesino."; }), "E_SPOILER"));
});

test("un hecho que ninguna pista revela es sólo un aviso", () => {
  const c = romper((c) => {
    c.hechos.push({ id: "h-ramon-movil", tipo: "movil", sujeto: "ramon", valor: true, descripcion: "Quería la finca." });
  });
  const i = verificarCaso(c);
  assert.equal(i.valido, true, JSON.stringify(i.errores));
  assert.ok(i.avisos.some((a) => a.codigo === "A_HECHO_SIN_PISTA"));
});

test("un testimonio sin pistas requeridas no se podría conseguir nunca en el juego", () => {
  const e = error(romper((c) => {
    const o = pista(c, "p-testimonio-ramon").origen;
    if (o.tipo === "testimonio") o.requiere = [];
  }), "E_TESTIMONIO_SIN_REQUISITOS");
  assert.ok(e);
  assert.match(e.mensaje, /p-testimonio-ramon/);
});

test("el culpable no puede dar un testimonio contra sí mismo", () => {
  const e = error(romper((c) => { pista(c, "p-testimonio-ramon").origen = { tipo: "testimonio", sospechoso: "enrique", requiere: ["p-botas"] }; }), "E_TESTIMONIO_CULPABLE");
  assert.ok(e);
});

test("el secreto de un sospechoso no puede hablar del crimen", () => {
  assert.ok(error(romper((c) => { sospechoso(c, "lucia").secreto = "Planeó envenenar a su padre con la doctora."; }), "E_SECRETO_CRIMEN"));
  assert.ok(error(romper((c) => { sospechoso(c, "lucia").secreto = "Quería matarle."; }), "E_SECRETO_CRIMEN"));
});

test("un caso sin ningún lugar cerrado da aviso", () => {
  const i = verificarCaso(romper((c) => { delete lugar(c, "bodega").requiere; }));
  assert.ok(i.avisos.some((a) => a.codigo === "A_SIN_LUGAR_CERRADO"));
});

test("una frase de reserva que nombra a otro sospechoso delata y da E_RESERVA_DELATA", () => {
  const e = error(romper((c) => { sospechoso(c, "ramon").respuestaReserva = "Vi a Enrique en la bodega."; }), "E_RESERVA_DELATA");
  assert.ok(e);
  assert.match(e.mensaje, /ramon/);
});

test("una frase de reserva con títulos en el nombre también se comprueba", () => {
  const c = romper((c) => {
    sospechoso(c, "carmen").nombre = "Doctora Carmen Rubio";
    sospechoso(c, "ramon").respuestaReserva = "La doctora no ha salido de aquí, y Carmen lo sabe.";
  });
  assert.ok(error(c, "E_RESERVA_DELATA"));
  assert.ok(!error(romper((c) => { sospechoso(c, "carmen").nombre = "Doctora Carmen Rubio"; sospechoso(c, "ramon").respuestaReserva = "La doctora no ha salido de aquí."; }), "E_RESERVA_DELATA"));
});

test("una frase de reserva que confiesa da E_RESERVA_DELATA", () => {
  assert.ok(error(romper((c) => { sospechoso(c, "enrique").respuestaReserva = "Está bien, fui yo."; }), "E_RESERVA_DELATA"));
});
