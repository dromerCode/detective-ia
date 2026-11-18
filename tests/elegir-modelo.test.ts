import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { aplicarAOpencode, candidatos, elegirModelo, fidelidad, mejorPorFidelidad } from "../scripts/elegir-modelo.ts";

const real: unknown = JSON.parse(readFileSync(new URL("./datos/llmfit.json", import.meta.url), "utf8"));

test("con la salida real de llmfit elige un modelo de chat que cabe en la GPU", () => {
  const r = elegirModelo(real);
  assert.equal(r?.modelo, "llama3.2:3b");
  assert.match(r?.motivo ?? "", /GPU/);
});

test("ignora los modelos sin nombre de Ollama, marginales o multimodales", () => {
  const r = elegirModelo({ models: [
    { name: "a", ollama_name: null, category: "Chat", fit_level: "Good", run_mode: "GPU", score: 99 },
    { name: "b", ollama_name: "b:1", category: "Chat", fit_level: "Marginal", run_mode: "GPU", score: 98 },
    { name: "c", ollama_name: "c:1", category: "Multimodal", fit_level: "Good", run_mode: "GPU", score: 97 },
    { name: "d", ollama_name: "d:1", category: "Chat", fit_level: "Good", run_mode: "CPU", score: 96 },
    { name: "e", ollama_name: "e:1", category: "General", fit_level: "Good", run_mode: "GPU", score: 50 },
  ] });
  assert.equal(r?.modelo, "e:1");
});

test("sin candidatos o con basura devuelve null", () => {
  assert.equal(elegirModelo({ models: [] }), null);
  assert.equal(elegirModelo(null), null);
  assert.equal(elegirModelo({ models: "x" }), null);
});

test("aplicarAOpencode conserva el resto de la configuración", () => {
  const r = aplicarAOpencode({ $schema: "s", permission: { external_directory: "deny" }, provider: { openrouter: { x: 1 } } }, "llama3.2:3b");
  assert.equal(r.$schema, "s");
  assert.deepEqual(r.permission, { external_directory: "deny" });
  assert.equal(r.small_model, "ollama/llama3.2:3b");
  const provider = r.provider as Record<string, { models?: Record<string, unknown> }>;
  assert.ok(provider.ollama?.models?.["llama3.2:3b"]);
  assert.deepEqual(provider.openrouter, { x: 1 });
});

test("candidatos devuelve los mejores sin repetir nombre de Ollama", () => {
  assert.deepEqual(candidatos(real, 2), ["llama3.2:3b", "qwen2.5:3b"]);
});

test("fidelidad cuenta las respuestas que respetan la coartada y no rompen el personaje", () => {
  assert.equal(fidelidad([
    { respuesta: "Estuve en el Salón toda la noche.", lugar: "Salón" },
    { respuesta: "Estaba en mi concesionario.", lugar: "Salón" },
    { respuesta: "Estuve en el patio. ¿Cómo puedo ayudarte?", lugar: "Patio" },
  ]), 1);
});

test("mejorPorFidelidad gana al de más puntuación de llmfit si es más fiel y empata a favor del primero", () => {
  assert.equal(mejorPorFidelidad([{ modelo: "a", aciertos: 1 }, { modelo: "b", aciertos: 3 }]), "b");
  assert.equal(mejorPorFidelidad([{ modelo: "a", aciertos: 2 }, { modelo: "b", aciertos: 2 }]), "a");
  assert.equal(mejorPorFidelidad([]), null);
});
