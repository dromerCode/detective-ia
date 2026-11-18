import { existsSync, readFileSync } from "node:fs";

export interface Config {
  ollama: { url: string; modelo: string };
  openrouter: { url: string; modelo: string; apiKey: string | null };
  timeoutMs: number;
}

interface ArchivoModelos {
  ollama?: { url?: string; modelo?: string };
  openrouter?: { modelo?: string };
  timeoutMs?: number;
}

export function cargarConfig(ruta: string, entorno: Record<string, string | undefined>): Config {
  let datos: ArchivoModelos = {};
  if (existsSync(ruta)) {
    try {
      datos = JSON.parse(readFileSync(ruta, "utf8")) as ArchivoModelos;
    } catch {
      throw new Error("config/modelos.json no es un JSON válido");
    }
  }
  return {
    ollama: {
      url: entorno.OLLAMA_URL ?? datos.ollama?.url ?? "http://localhost:11434/v1",
      modelo: entorno.OLLAMA_MODELO ?? datos.ollama?.modelo ?? "qwen3:4b",
    },
    openrouter: {
      url: "https://openrouter.ai/api/v1",
      modelo: entorno.OPENROUTER_MODELO ?? datos.openrouter?.modelo ?? "openrouter/free",
      apiKey: entorno.OPENROUTER_API_KEY ?? null,
    },
    timeoutMs: datos.timeoutMs ?? 30000,
  };
}
