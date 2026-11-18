import { test } from "node:test";
import assert from "node:assert/strict";
import { crearProveedorOpenAI, generarConRespaldo, type Proveedor } from "../src/servidor/proveedores.ts";

const MENSAJES = [{ role: "user" as const, content: "hola" }];

function respuestaOk(texto: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content: texto } }] }), { status: 200 });
}

function falso(nombre: string, resultado: string | Error): Proveedor {
  return {
    nombre,
    generar: async (): Promise<string> => {
      if (resultado instanceof Error) throw resultado;
      return resultado;
    },
  };
}

test("el proveedor OpenAI envía modelo y mensajes y devuelve el texto", async () => {
  let cuerpo: unknown = null;
  let cabeceras: Headers | null = null;
  const fetchFn = async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    cuerpo = JSON.parse(String(init?.body));
    cabeceras = new Headers(init?.headers);
    return respuestaOk("Buenas noches, inspector.");
  };
  const p = crearProveedorOpenAI({ nombre: "or", url: "http://x/v1", modelo: "m1", apiKey: "k", timeoutMs: 1000, fetchFn });
  assert.equal(await p.generar(MENSAJES), "Buenas noches, inspector.");
  assert.deepEqual((cuerpo as { model: string }).model, "m1");
  assert.equal(cabeceras!.get("authorization"), "Bearer k");
});

test("quita el bloque de razonamiento <think>", async () => {
  const fetchFn = async (): Promise<Response> => respuestaOk("<think>pienso</think>\nNo sé nada.");
  const p = crearProveedorOpenAI({ nombre: "o", url: "http://x/v1", modelo: "m", timeoutMs: 1000, fetchFn });
  assert.equal(await p.generar(MENSAJES), "No sé nada.");
});

test("una respuesta vacía cuenta como fallo", async () => {
  const fetchFn = async (): Promise<Response> => respuestaOk("   ");
  const p = crearProveedorOpenAI({ nombre: "o", url: "http://x/v1", modelo: "m", timeoutMs: 1000, fetchFn });
  await assert.rejects(p.generar(MENSAJES));
});

test("un HTTP de error cuenta como fallo", async () => {
  const fetchFn = async (): Promise<Response> => new Response("no", { status: 500 });
  const p = crearProveedorOpenAI({ nombre: "o", url: "http://x/v1", modelo: "m", timeoutMs: 1000, fetchFn });
  await assert.rejects(p.generar(MENSAJES));
});

test("si tarda más del timeout se aborta", async () => {
  const fetchFn = (_u: string | URL | Request, init?: RequestInit): Promise<Response> =>
    new Promise((_ok, ko) => init?.signal?.addEventListener("abort", () => ko(new Error("abortado"))));
  const p = crearProveedorOpenAI({ nombre: "o", url: "http://x/v1", modelo: "m", timeoutMs: 50, fetchFn });
  await assert.rejects(p.generar(MENSAJES));
});

test("generarConRespaldo usa el siguiente proveedor si el primero falla", async () => {
  const r = await generarConRespaldo([falso("ollama", new Error("caído")), falso("openrouter", "Hola")], MENSAJES);
  assert.deepEqual(r, { texto: "Hola", proveedor: "openrouter" });
});

test("generarConRespaldo devuelve null si fallan todos", async () => {
  assert.equal(await generarConRespaldo([falso("a", new Error("x")), falso("b", new Error("y"))], MENSAJES), null);
});
