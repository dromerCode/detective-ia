export interface Mensaje {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface Proveedor {
  nombre: string;
  generar(mensajes: Mensaje[]): Promise<string>;
}

export interface OpcionesProveedor {
  nombre: string;
  url: string;
  modelo: string;
  apiKey?: string;
  timeoutMs: number;
  fetchFn?: typeof fetch;
}

interface RespuestaChat {
  choices?: { message?: { content?: string } }[];
}

// Sirve para Ollama y OpenRouter: los dos hablan la API de OpenAI
export function crearProveedorOpenAI(o: OpcionesProveedor): Proveedor {
  const fetchFn = o.fetchFn ?? fetch;
  return {
    nombre: o.nombre,
    async generar(mensajes: Mensaje[]): Promise<string> {
      const control = new AbortController();
      const reloj = setTimeout(() => control.abort(), o.timeoutMs);
      try {
        const cabeceras: Record<string, string> = { "content-type": "application/json" };
        if (o.apiKey) cabeceras.authorization = `Bearer ${o.apiKey}`;
        const res = await fetchFn(`${o.url}/chat/completions`, {
          method: "POST",
          headers: cabeceras,
          body: JSON.stringify({ model: o.modelo, messages: mensajes, temperature: 0.5, max_tokens: 200 }),
          signal: control.signal,
        });
        if (!res.ok) throw new Error(`${o.nombre} respondió ${res.status}`);
        const datos = (await res.json()) as RespuestaChat;
        const texto = (datos.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        if (!texto) throw new Error(`${o.nombre} devolvió una respuesta vacía`);
        return texto;
      } finally {
        clearTimeout(reloj);
      }
    },
  };
}

export async function generarConRespaldo(
  proveedores: Proveedor[],
  mensajes: Mensaje[],
): Promise<{ texto: string; proveedor: string } | null> {
  for (const p of proveedores) {
    try {
      return { texto: await p.generar(mensajes), proveedor: p.nombre };
    } catch (e) {
      console.warn(`[npc] ${p.nombre} ha fallado: ${(e as Error).message}`);
    }
  }
  return null;
}
