import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cargarConfig } from "../src/servidor/config.ts";

function archivo(contenido: string): string {
  const ruta = join(mkdtempSync(join(tmpdir(), "cfg-")), "modelos.json");
  writeFileSync(ruta, contenido);
  return ruta;
}

test("lee modelos del archivo y la key del entorno", () => {
  const ruta = archivo(JSON.stringify({ ollama: { url: "http://h:1/v1", modelo: "qwen" }, openrouter: { modelo: "free" }, timeoutMs: 5000 }));
  const c = cargarConfig(ruta, { OPENROUTER_API_KEY: "k" });
  assert.equal(c.ollama.modelo, "qwen");
  assert.equal(c.openrouter.apiKey, "k");
  assert.equal(c.timeoutMs, 5000);
});

test("sin archivo usa valores por defecto y sin key deja null", () => {
  const c = cargarConfig("/no/existe.json", {});
  assert.equal(c.ollama.url, "http://localhost:11434/v1");
  assert.equal(c.openrouter.apiKey, null);
});

test("un archivo corrupto lanza un error en español", () => {
  assert.throws(() => cargarConfig(archivo("{mal"), {}), /config\/modelos\.json no es un JSON válido/);
});
