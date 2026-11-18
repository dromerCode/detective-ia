// Uso: node scripts/elegir-modelo.ts [--aplicar]
// Pregunta a llmfit qué modelos caben aquí, elige uno y (con --aplicar) lo baja con Ollama y lo configura.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { promptSistema } from "../src/servidor/npc.ts";
import { rompePersonaje } from "../src/servidor/filtro.ts";
import { crearProveedorOpenAI } from "../src/servidor/proveedores.ts";
import type { Caso } from "../src/caso/tipos.ts";

interface ModeloLlmfit {
  name: string;
  ollama_name: string | null;
  category: string;
  fit_level: string;
  run_mode: string;
  score: number;
  estimated_tps?: number;
  memory_required_gb?: number;
}

type Json = Record<string, unknown>;

const PREGUNTAS_FIDELIDAD = [
  "¿Dónde estaba usted entre las diez y las diez y media?",
  "¿Qué estaba haciendo cuando ocurrió todo?",
  "Cuénteme cómo fue su noche.",
];

function aptos(salida: unknown): ModeloLlmfit[] {
  const modelos = (salida as { models?: unknown } | null)?.models;
  if (!Array.isArray(modelos)) return [];
  return (modelos as ModeloLlmfit[])
    .filter((m) => m.ollama_name && ["Chat", "General"].includes(m.category) && ["Perfect", "Good"].includes(m.fit_level) && m.run_mode === "GPU")
    .sort((a, b) => b.score - a.score);
}

export function candidatos(salida: unknown, n: number): string[] {
  return [...new Set(aptos(salida).map((m) => m.ollama_name ?? ""))].slice(0, n);
}

export function fidelidad(pruebas: { respuesta: string; lugar: string }[]): number {
  return pruebas.filter((p) => p.respuesta.toLowerCase().includes(p.lugar.toLowerCase()) && !rompePersonaje(p.respuesta)).length;
}

export function mejorPorFidelidad(resultados: { modelo: string; aciertos: number }[]): string | null {
  let mejor: { modelo: string; aciertos: number } | null = null;
  for (const r of resultados) if (!mejor || r.aciertos > mejor.aciertos) mejor = r;
  return mejor?.modelo ?? null;
}

export function elegirModelo(salida: unknown): { modelo: string; motivo: string } | null {
  const m = aptos(salida)[0];
  if (!m?.ollama_name) return null;
  return { modelo: m.ollama_name, motivo: `${m.name}: puntuación ${m.score}, ajuste ${m.fit_level} en GPU, ${m.memory_required_gb ?? "?"} GB, ~${m.estimated_tps ?? "?"} tok/s` };
}

export function aplicarAOpencode(config: Json, modelo: string): Json {
  const provider = (config.provider ?? {}) as Json;
  return {
    ...config,
    small_model: `ollama/${modelo}`,
    provider: {
      ...provider,
      ollama: {
        npm: "@ai-sdk/openai-compatible",
        name: "Ollama (local)",
        options: { baseURL: "http://localhost:11434/v1" },
        models: { [modelo]: { name: `${modelo} (elegido con llmfit)` } },
      },
    },
  };
}

// Pregunta a cada sospechoso del caso de referencia dónde estaba: un modelo que se inventa la coartada no sirve
async function probarFidelidad(modelo: string): Promise<number> {
  const caso = JSON.parse(readFileSync("casos/el-cortijo.json", "utf8")) as Caso;
  const proveedor = crearProveedorOpenAI({ nombre: modelo, url: "http://localhost:11434/v1", modelo, timeoutMs: 120000 });
  const pruebas: { respuesta: string; lugar: string }[] = [];
  for (const s of caso.sospechosos) {
    for (const pregunta of PREGUNTAS_FIDELIDAD) {
      const respuesta = await proveedor.generar([
        { role: "system", content: promptSistema(caso, s, new Set(), null) },
        { role: "user", content: pregunta },
      ]);
      const lugar = caso.lugares.find((l) => l.id === s.coartada.lugar)?.nombre ?? "";
      console.log(`  [${modelo}] ${s.nombre}: ${respuesta}`);
      pruebas.push({ respuesta, lugar });
    }
  }
  return fidelidad(pruebas);
}

async function principal(): Promise<void> {
  const salida: unknown = JSON.parse(execFileSync("llmfit", ["recommend", "--json", "-n", "200"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
  const elegido = elegirModelo(salida);
  if (!elegido) {
    console.error("llmfit no ha recomendado ningún modelo de Ollama que quepa en la GPU.");
    process.exit(1);
  }
  console.log(`Primera opción de llmfit: ${elegido.modelo}\nMotivo: ${elegido.motivo}`);
  if (!process.argv.includes("--aplicar")) return;

  const resultados: { modelo: string; aciertos: number }[] = [];
  for (const modelo of candidatos(salida, 2)) {
    execFileSync("ollama", ["pull", modelo], { stdio: "ignore" });
    const aciertos = await probarFidelidad(modelo);
    console.log(`Fidelidad de ${modelo}: ${aciertos}/12 respuestas fieles a la coartada`);
    resultados.push({ modelo, aciertos });
  }
  const modelo = mejorPorFidelidad(resultados) ?? elegido.modelo;
  console.log(`Modelo elegido: ${modelo}`);

  const opencode = JSON.parse(readFileSync("opencode.json", "utf8")) as Json;
  writeFileSync("opencode.json", `${JSON.stringify(aplicarAOpencode(opencode, modelo), null, 2)}\n`);
  const modelos = JSON.parse(readFileSync("config/modelos.json", "utf8")) as { ollama: { modelo: string } };
  modelos.ollama.modelo = modelo;
  writeFileSync("config/modelos.json", `${JSON.stringify(modelos, null, 2)}\n`);
  console.log("Actualizados opencode.json y config/modelos.json.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) principal().catch((e: unknown) => {
  console.error(`No se ha podido elegir el modelo: ${(e as Error).message}`);
  process.exit(1);
});
