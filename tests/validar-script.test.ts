import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { romper } from "./casos-rotos.ts";

function ejecutar(args: string[]): { codigo: number | null; salida: string } {
  const r = spawnSync(process.execPath, ["scripts/validar-caso.ts", ...args], { encoding: "utf8" });
  return { codigo: r.status, salida: r.stdout };
}

test("--todos --json valida todos los casos publicados", () => {
  const r = ejecutar(["--todos", "--json"]);
  assert.equal(r.codigo, 0, r.salida);
  const informes = JSON.parse(r.salida) as { archivo: string; valido: boolean }[];
  assert.ok(informes.length >= 1);
  assert.ok(informes.every((i) => i.valido));
});

test("un caso roto sale con código 1 y explica el error", () => {
  const dir = mkdtempSync(join(tmpdir(), "caso-"));
  const ruta = join(dir, "roto.json");
  writeFileSync(ruta, JSON.stringify(romper((c) => { c.solucion.culpable = "lucia"; })));
  const r = ejecutar([ruta]);
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /E_CULPABLE_DESCARTADO/);
});

test("un archivo que no es JSON se informa sin traza", () => {
  const dir = mkdtempSync(join(tmpdir(), "caso-"));
  const ruta = join(dir, "malo.json");
  writeFileSync(ruta, "{ esto no es json");
  const r = ejecutar([ruta]);
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /no es un JSON válido/);
});
