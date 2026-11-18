import { test } from "node:test";
import assert from "node:assert/strict";
import { validarEstructura } from "../src/caso/estructura.ts";
import { casoValido, romper } from "./casos-rotos.ts";

function codigos(datos: unknown): string[] {
  return validarEstructura(datos).errores.map((e) => e.codigo);
}

test("el caso de referencia no tiene errores de estructura", () => {
  const r = validarEstructura(casoValido());
  assert.deepEqual(r.errores, []);
  assert.ok(r.caso);
});

test("un número no es un caso", () => {
  const r = validarEstructura(42);
  assert.equal(r.errores[0]?.codigo, "E_ESTRUCTURA");
  assert.equal(r.caso, null);
});

test("hora imposible da E_HORA", () => {
  assert.ok(codigos(romper((c) => { c.crimen.desde = "25:00"; })).includes("E_HORA"));
});

test("desde igual a hasta da E_HORA", () => {
  assert.ok(codigos(romper((c) => { c.crimen.hasta = c.crimen.desde; })).includes("E_HORA"));
});

test("id repetido da E_ID_DUPLICADO", () => {
  assert.ok(codigos(romper((c) => { c.pistas[1]!.id = c.pistas[0]!.id; })).includes("E_ID_DUPLICADO"));
});

test("id repetido entre colecciones distintas da E_ID_DUPLICADO", () => {
  assert.ok(codigos(romper((c) => { c.hechos[0]!.id = c.lugares[0]!.id; })).includes("E_ID_DUPLICADO"));
});

test("pista que revela un hecho inexistente da E_REFERENCIA", () => {
  assert.ok(codigos(romper((c) => { c.pistas[0]!.revela.push("nada"); })).includes("E_REFERENCIA"));
});

test("culpable inexistente da E_REFERENCIA", () => {
  assert.ok(codigos(romper((c) => { c.solucion.culpable = "fantasma"; })).includes("E_REFERENCIA"));
});

test("tipo de hecho desconocido da E_ESTRUCTURA", () => {
  const r = validarEstructura(romper((c) => { (c.hechos[0] as { tipo: string }).tipo = "x"; }));
  assert.ok(r.errores.some((e) => e.codigo === "E_ESTRUCTURA"));
  assert.equal(r.caso, null);
});

test("texto vacío da E_ESTRUCTURA", () => {
  assert.ok(codigos(romper((c) => { c.sospechosos[0]!.nombre = "  "; })).includes("E_ESTRUCTURA"));
});

test("los mensajes de error están en español", () => {
  const r = validarEstructura(romper((c) => { c.solucion.culpable = "fantasma"; }));
  assert.match(r.errores[0]!.mensaje, /no existe/);
});

test("no lanza excepciones con basura", () => {
  for (const d of [null, [], "x", { lugares: 3 }, { hechos: [null] }, { pistas: [{ revela: "a" }] }]) {
    assert.doesNotThrow(() => validarEstructura(d));
  }
});
