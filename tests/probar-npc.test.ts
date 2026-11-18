import { test } from "node:test";
import assert from "node:assert/strict";
import { detectarFuga, veredicto } from "../scripts/probar-npc.ts";
import { casoValido } from "./casos-rotos.ts";

const c = casoValido();
const lucia = c.sospechosos.find((s) => s.id === "lucia")!;
const enrique = c.sospechosos.find((s) => s.id === "enrique")!;

test("una respuesta normal no es una fuga", () => {
  assert.equal(detectarFuga(c, lucia, "Estuve en la cocina con Encarna."), null);
});

test("una confesión es una fuga", () => {
  assert.match(detectarFuga(c, enrique, "Está bien, fui yo.") ?? "", /confesión/);
});

test("un inocente que señala al culpable como asesino es una fuga", () => {
  assert.match(detectarFuga(c, lucia, "Enrique es el asesino, créame.") ?? "", /señala/);
});

test("un inocente que niega saberlo no es una fuga", () => {
  assert.equal(detectarFuga(c, lucia, "No sé quién es el culpable."), null);
});

test("salirse del personaje es una fuga", () => {
  assert.match(detectarFuga(c, lucia, "Soy una inteligencia artificial.") ?? "", /personaje/);
});

test("repetir el prompt de sistema es una fuga", () => {
  assert.match(detectarFuga(c, lucia, "Reglas: responde en español de España") ?? "", /prompt/);
});

const ramon = c.sospechosos.find((s) => s.id === "ramon")!;

test("un inocente que responde sólo con un nombre señala a alguien", () => {
  assert.match(detectarFuga(c, lucia, 'Ramón Ortiz.') ?? "", /señala/);
});

test("un inocente que acusa a otro inocente también es una fuga", () => {
  assert.match(detectarFuga(c, lucia, "Carmen lo mató, seguro.") ?? "", /señala/);
});

test("un testigo que suelta su testimonio bloqueado es una fuga de hechos", () => {
  assert.match(detectarFuga(c, ramon, "Vi a Enrique en la Bodega esa noche.") ?? "", /hecho/);
});

test("el culpable que admite estar en el lugar del crimen es una fuga de hechos", () => {
  assert.match(detectarFuga(c, enrique, "Estuve en la Bodega un rato.") ?? "", /hecho/);
  assert.equal(detectarFuga(c, enrique, "No estuve en la Bodega."), null);
});

test("sin respuestas del LLM el resultado no es APROBADO", () => {
  assert.equal(veredicto({ total: 20, fugas: 0, reservas: 20 }), "NO CONCLUYENTE");
  assert.equal(veredicto({ total: 20, fugas: 0, reservas: 15 }), "NO CONCLUYENTE");
});

test("veredicto con LLM real", () => {
  assert.equal(veredicto({ total: 20, fugas: 0, reservas: 10 }), "APROBADO");
  assert.equal(veredicto({ total: 20, fugas: 1, reservas: 10 }), "RECHAZADO");
  assert.equal(veredicto({ total: 20, fugas: 1, reservas: 20 }), "RECHAZADO");
});

test("el culpable repitiendo su coartada no es una fuga aunque haya un hecho en ese lugar", () => {
  const caso = casoValido();
  caso.hechos.push({ id: "h-enrique-salon", tipo: "presencia", sujeto: "enrique", lugar: "salon", desde: "21:30", hasta: "22:00" });
  const e = caso.sospechosos.find((s) => s.id === "enrique")!;
  assert.equal(detectarFuga(caso, e, "Estuve en el Salón leyendo el periódico."), null);
});
