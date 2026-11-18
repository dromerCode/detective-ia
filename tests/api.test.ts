import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cargarCasos, crearServidor } from "../src/servidor/api.ts";
import type { Proveedor } from "../src/servidor/proveedores.ts";
import { casoValido, romper } from "./casos-rotos.ts";

const prov: Proveedor = { nombre: "falso", generar: async (): Promise<string> => "No sé nada de eso." };
let servidor: Server;
let base: string;

before(async () => {
  const dirWeb = mkdtempSync(join(tmpdir(), "web-"));
  writeFileSync(join(dirWeb, "index.html"), "<h1>Detective</h1>");
  servidor = crearServidor({ casos: [casoValido()], proveedores: [prov], dirWeb });
  await new Promise<void>((ok) => servidor.listen(0, ok));
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});

after(() => { servidor.close(); });

async function post(ruta: string, cuerpo: unknown): Promise<{ estado: number; datos: Record<string, unknown> }> {
  const res = await fetch(base + ruta, { method: "POST", body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo) });
  return { estado: res.status, datos: (await res.json()) as Record<string, unknown> };
}

test("lista los casos sin la solución", async () => {
  const res = await fetch(`${base}/api/casos`);
  const texto = await res.text();
  assert.equal(res.status, 200);
  assert.match(texto, /el-cortijo/);
  assert.ok(!texto.includes("solucion"));
});

test("partida completa: crear, explorar, interrogar y acusar", async () => {
  const { datos } = await post("/api/partidas", { casoId: "el-cortijo" });
  const id = String(datos.partidaId);
  for (const lugarId of ["despacho", "bodega", "cuarto-invitados"]) {
    assert.equal((await post(`/api/partidas/${id}/explorar`, { lugarId })).estado, 200);
  }
  const charla = await post(`/api/partidas/${id}/interrogar`, { sospechosoId: "ramon", mensaje: "¿Y estas botas?", pistaPresentada: "p-botas" });
  assert.equal(charla.datos.respuesta, "No sé nada de eso.");
  assert.equal((charla.datos.pistasNuevas as { id: string }[])[0]?.id, "p-testimonio-ramon");
  const fin = await post(`/api/partidas/${id}/acusar`, { culpable: "enrique", pruebas: ["p-testimonio-ramon", "p-copia-llave", "p-pagares"] });
  assert.equal(fin.datos.acierto, true);
  assert.equal(fin.datos.puntuacion, 1590);
  assert.equal((await post(`/api/partidas/${id}/acusar`, { culpable: "enrique", pruebas: [] })).estado, 409);
});

test("un lugar cerrado da 403", async () => {
  const { datos } = await post("/api/partidas", { casoId: "el-cortijo" });
  assert.equal((await post(`/api/partidas/${String(datos.partidaId)}/explorar`, { lugarId: "bodega" })).estado, 403);
});

test("un cuerpo que no es JSON da 400 en español", async () => {
  const r = await post("/api/partidas", "no json");
  assert.equal(r.estado, 400);
  assert.match(String(r.datos.error), /JSON/);
});

test("campos de tipo incorrecto dan 400 y el servidor sigue vivo", async () => {
  const { datos } = await post("/api/partidas", { casoId: "el-cortijo" });
  const id = String(datos.partidaId);
  assert.equal((await post(`/api/partidas/${id}/interrogar`, { sospechosoId: "ramon", mensaje: 3 })).estado, 400);
  assert.equal((await post(`/api/partidas/${id}/interrogar`, { sospechosoId: "ramon", mensaje: "x".repeat(501) })).estado, 400);
  assert.equal((await post(`/api/partidas/${id}/acusar`, { culpable: "enrique", pruebas: "p" })).estado, 400);
  assert.equal((await fetch(`${base}/api/casos`)).status, 200);
});

test("un cuerpo demasiado grande da 413", async () => {
  assert.equal((await post("/api/partidas", { casoId: "x".repeat(20000) })).estado, 413);
});

test("caso o partida inexistentes dan 404", async () => {
  assert.equal((await post("/api/partidas", { casoId: "nada" })).estado, 404);
  assert.equal((await post("/api/partidas/nada/explorar", { lugarId: "salon" })).estado, 404);
});

test("sirve la web y no deja salir del directorio", async () => {
  assert.match(await (await fetch(`${base}/`)).text(), /Detective/);
  assert.equal((await fetch(`${base}/..%2f..%2f..%2fetc%2fpasswd`)).status, 404);
  assert.equal((await fetch(`${base}/no-existe.css`)).status, 404);
});

test("cargarCasos ignora los casos no válidos", () => {
  const dir = mkdtempSync(join(tmpdir(), "casos-"));
  writeFileSync(join(dir, "bueno.json"), JSON.stringify(casoValido()));
  writeFileSync(join(dir, "roto.json"), JSON.stringify(romper((c) => { c.solucion.culpable = "lucia"; })));
  writeFileSync(join(dir, "malo.json"), "{");
  assert.deepEqual(cargarCasos(dir).map((c) => c.id), ["el-cortijo"]);
});
