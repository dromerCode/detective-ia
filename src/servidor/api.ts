import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { verificarCaso } from "../caso/verificador.ts";
import type { Caso } from "../caso/tipos.ts";
import { acusar, crearPartida, ErrorJuego, estadoPublico, explorar, prepararInterrogatorio, type Partida } from "../juego/partida.ts";
import { responderNpc } from "./npc.ts";
import type { Proveedor } from "./proveedores.ts";

const MAX_CUERPO = 10 * 1024;
const MAX_MENSAJE = 500;
const TIPOS: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
};

type Cuerpo = Record<string, unknown>;

export interface OpcionesServidor {
  casos: Caso[];
  proveedores: Proveedor[];
  dirWeb: string;
}

export function cargarCasos(dir: string): Caso[] {
  const casos: Caso[] = [];
  for (const archivo of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    let datos: unknown = null;
    try {
      datos = JSON.parse(readFileSync(join(dir, archivo), "utf8"));
    } catch {
      console.warn(`[casos] ${archivo} no es un JSON válido: se ignora`);
      continue;
    }
    const informe = verificarCaso(datos);
    if (informe.valido) casos.push(datos as Caso);
    else console.warn(`[casos] ${archivo} no pasa el verificador: ${informe.errores.map((e) => e.codigo).join(", ")}`);
  }
  return casos;
}

function responder(res: ServerResponse, estado: number, datos: unknown): void {
  res.writeHead(estado, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(datos));
}

async function leerCuerpo(req: IncomingMessage): Promise<Cuerpo> {
  const trozos: Buffer[] = [];
  let tam = 0;
  for await (const trozo of req) {
    const b = trozo as Buffer;
    tam += b.length;
    if (tam <= MAX_CUERPO) trozos.push(b);
  }
  if (tam > MAX_CUERPO) throw new ErrorJuego(413, "La petición es demasiado grande.");
  let datos: unknown;
  try {
    datos = JSON.parse(Buffer.concat(trozos).toString("utf8"));
  } catch {
    throw new ErrorJuego(400, "El cuerpo de la petición no es un JSON válido.");
  }
  if (typeof datos !== "object" || datos === null || Array.isArray(datos)) throw new ErrorJuego(400, "El cuerpo de la petición debe ser un objeto JSON.");
  return datos as Cuerpo;
}

function texto(c: Cuerpo, campo: string): string {
  const v = c[campo];
  if (typeof v !== "string" || v.trim() === "") throw new ErrorJuego(400, `Falta el campo "${campo}" o no es un texto.`);
  return v;
}

function servirEstatico(res: ServerResponse, dirWeb: string, ruta: string): void {
  const raiz = resolve(dirWeb);
  let relativa: string;
  try {
    relativa = decodeURIComponent(ruta === "/" ? "/index.html" : ruta);
  } catch {
    responder(res, 404, { error: "No encontrado." });
    return;
  }
  const archivo = resolve(join(raiz, relativa));
  const dentro = archivo.startsWith(raiz + sep);
  if (!dentro || !statSync(archivo, { throwIfNoEntry: false })?.isFile()) {
    responder(res, 404, { error: "No encontrado." });
    return;
  }
  res.writeHead(200, { "content-type": TIPOS[extname(archivo)] ?? "application/octet-stream" });
  res.end(readFileSync(archivo));
}

export function crearServidor(o: OpcionesServidor): Server {
  const partidas = new Map<string, Partida>();

  const buscarPartida = (id: string): Partida => {
    const p = partidas.get(id);
    if (!p) throw new ErrorJuego(404, "Esa partida no existe.");
    return p;
  };

  const interrogar = async (p: Partida, c: Cuerpo): Promise<unknown> => {
    const sospechosoId = texto(c, "sospechosoId");
    const mensaje = texto(c, "mensaje");
    if (mensaje.length > MAX_MENSAJE) throw new ErrorJuego(400, `El mensaje no puede pasar de ${MAX_MENSAJE} caracteres.`);
    const presentadaId = c.pistaPresentada === undefined || c.pistaPresentada === null ? undefined : texto(c, "pistaPresentada");
    const { testimonio } = prepararInterrogatorio(p, sospechosoId, presentadaId);
    const sospechoso = p.caso.sospechosos.find((s) => s.id === sospechosoId);
    if (!sospechoso) throw new ErrorJuego(404, "Ese sospechoso no existe.");
    const presentada = p.caso.pistas.find((x) => x.id === presentadaId);
    const r = await responderNpc(p, sospechoso, mensaje, testimonio, o.proveedores, presentada);
    return { ...r, pistasNuevas: testimonio ? [{ id: testimonio.id, nombre: testimonio.nombre, texto: testimonio.texto }] : [], estado: estadoPublico(p) };
  };

  const atender = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const ruta = new URL(req.url ?? "/", "http://localhost").pathname;

    if (req.method === "GET" && ruta === "/api/casos") {
      responder(res, 200, o.casos.map((c) => ({ id: c.id, titulo: c.titulo, introduccion: c.introduccion, dificultad: c.dificultad })));
      return;
    }
    if (req.method === "POST" && ruta === "/api/partidas") {
      const casoId = texto(await leerCuerpo(req), "casoId");
      const caso = o.casos.find((c) => c.id === casoId);
      if (!caso) throw new ErrorJuego(404, "Ese caso no existe.");
      const p = crearPartida(caso, randomUUID());
      partidas.set(p.id, p);
      responder(res, 200, { partidaId: p.id, estado: estadoPublico(p) });
      return;
    }
    const m = /^\/api\/partidas\/([^/]+)\/(explorar|interrogar|acusar)$/.exec(ruta);
    if (req.method === "POST" && m) {
      const c = await leerCuerpo(req);
      const p = buscarPartida(m[1] ?? "");
      if (m[2] === "explorar") {
        const nuevas = explorar(p, texto(c, "lugarId"));
        responder(res, 200, { pistasNuevas: nuevas.map((x) => ({ id: x.id, nombre: x.nombre, texto: x.texto })), estado: estadoPublico(p) });
      } else if (m[2] === "interrogar") {
        responder(res, 200, await interrogar(p, c));
      } else {
        const pruebas = c.pruebas;
        if (!Array.isArray(pruebas) || !pruebas.every((x) => typeof x === "string")) throw new ErrorJuego(400, "\"pruebas\" debe ser una lista de pistas.");
        responder(res, 200, acusar(p, texto(c, "culpable"), pruebas as string[]));
      }
      return;
    }
    if (ruta.startsWith("/api/")) throw new ErrorJuego(404, "No encontrado.");
    if (req.method === "GET") {
      servirEstatico(res, o.dirWeb, ruta);
      return;
    }
    throw new ErrorJuego(404, "No encontrado.");
  };

  return createServer((req, res) => {
    atender(req, res).catch((e: unknown) => {
      if (e instanceof ErrorJuego) {
        responder(res, e.estado, { error: e.message });
      } else {
        console.error(e);
        responder(res, 500, { error: "Error interno del servidor." });
      }
    });
  });
}
