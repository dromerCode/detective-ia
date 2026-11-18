import { test } from "node:test";
import assert from "node:assert/strict";
import { acusar, crearPartida, ErrorJuego, estadoPublico, explorar, prepararInterrogatorio, type Partida } from "../src/juego/partida.ts";
import { casoValido } from "./casos-rotos.ts";

function nueva(): Partida {
  return crearPartida(casoValido(), "p1");
}

function codigoDe(f: () => unknown): number {
  try {
    f();
  } catch (e) {
    if (e instanceof ErrorJuego) return e.estado;
    throw e;
  }
  return 0;
}

test("explorar un lugar abierto da sus pistas y las mete en el cuaderno", () => {
  const p = nueva();
  const pistas = explorar(p, "despacho").map((x) => x.id);
  assert.deepEqual(pistas.sort(), ["p-cuaderno-cerradura", "p-llave-bodega", "p-pagares"]);
  assert.ok(p.pistas.has("p-pagares"));
});

test("explorar dos veces no repite pistas", () => {
  const p = nueva();
  explorar(p, "despacho");
  assert.deepEqual(explorar(p, "despacho"), []);
});

test("la bodega está cerrada hasta tener la llave", () => {
  const p = nueva();
  assert.equal(codigoDe(() => explorar(p, "bodega")), 403);
  explorar(p, "despacho");
  assert.deepEqual(explorar(p, "bodega").map((x) => x.id), ["p-barro-bodega"]);
});

test("un lugar que no existe da 404", () => {
  assert.equal(codigoDe(() => explorar(nueva(), "luna")), 404);
});

test("presentar una pista que no tienes da 400", () => {
  assert.equal(codigoDe(() => prepararInterrogatorio(nueva(), "ramon", "p-botas")), 400);
});

test("interrogar a alguien que no existe da 404", () => {
  assert.equal(codigoDe(() => prepararInterrogatorio(nueva(), "nadie")), 404);
});

test("presentar las botas a Ramón con el barro visto desbloquea su testimonio", () => {
  const p = nueva();
  explorar(p, "despacho");
  explorar(p, "bodega");
  explorar(p, "cuarto-invitados");
  const r = prepararInterrogatorio(p, "ramon", "p-botas");
  assert.equal(r.testimonio?.id, "p-testimonio-ramon");
  assert.ok(p.pistas.has("p-testimonio-ramon"));
  assert.equal(p.preguntas, 1);
});

test("sin todas las pistas requeridas no hay testimonio", () => {
  const p = nueva();
  explorar(p, "cuarto-invitados");
  assert.equal(prepararInterrogatorio(p, "ramon", "p-botas").testimonio, null);
});

test("presentar la pista a otro sospechoso no da el testimonio", () => {
  const p = nueva();
  explorar(p, "despacho");
  explorar(p, "bodega");
  explorar(p, "cuarto-invitados");
  assert.equal(prepararInterrogatorio(p, "lucia", "p-botas").testimonio, null);
});

test("acusar al culpable con las pruebas clave puntúa 1000 + 200 por prueba - 10 por pregunta", () => {
  const p = nueva();
  for (const l of ["despacho", "bodega", "cuarto-invitados"]) explorar(p, l);
  prepararInterrogatorio(p, "ramon", "p-botas");
  const r = acusar(p, "enrique", ["p-testimonio-ramon", "p-copia-llave", "p-pagares"]);
  assert.equal(r.acierto, true);
  assert.equal(r.puntuacion, 1000 + 600 - 10);
  assert.ok(r.explicacion.length > 0);
});

test("las pruebas que no son clave restan", () => {
  const p = nueva();
  explorar(p, "despacho");
  assert.equal(acusar(p, "enrique", ["p-pagares", "p-llave-bodega"]).puntuacion, 1000 + 200 - 100);
});

test("acusar con una prueba que no tienes da 400", () => {
  assert.equal(codigoDe(() => acusar(nueva(), "enrique", ["p-pagares"])), 400);
});

test("acusar a un inocente da 0 y revela la explicación", () => {
  const r = acusar(nueva(), "lucia", []);
  assert.equal(r.acierto, false);
  assert.equal(r.puntuacion, 0);
  assert.match(r.explicacion, /Enrique/);
});

test("tras acusar la partida termina", () => {
  const p = nueva();
  acusar(p, "lucia", []);
  assert.equal(codigoDe(() => acusar(p, "enrique", [])), 409);
  assert.equal(codigoDe(() => prepararInterrogatorio(p, "ramon")), 409);
  assert.equal(codigoDe(() => explorar(p, "salon")), 409);
});

test("el estado público no filtra secretos ni la solución", () => {
  const p = nueva();
  const json = JSON.stringify(estadoPublico(p));
  for (const prohibido of ["secreto", "solucion", "explicacion", "mienteCoartada", "concesionario está en quiebra", "Bodega\",\"descripcion"]) {
    assert.ok(!json.includes(prohibido), prohibido);
  }
  const e = estadoPublico(p);
  assert.equal(e.lugares.find((l) => l.id === "bodega")?.abierto, false);
  assert.equal(e.sospechosos.length, 4);
});
