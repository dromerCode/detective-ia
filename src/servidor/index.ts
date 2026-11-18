import { cargarCasos, crearServidor } from "./api.ts";
import { cargarConfig } from "./config.ts";
import { crearProveedorOpenAI, type Proveedor } from "./proveedores.ts";

const config = cargarConfig("config/modelos.json", process.env);
const proveedores: Proveedor[] = [
  crearProveedorOpenAI({ nombre: "ollama", url: config.ollama.url, modelo: config.ollama.modelo, timeoutMs: config.timeoutMs }),
];
if (config.openrouter.apiKey) {
  proveedores.push(crearProveedorOpenAI({ nombre: "openrouter", url: config.openrouter.url, modelo: config.openrouter.modelo, apiKey: config.openrouter.apiKey, timeoutMs: config.timeoutMs }));
} else {
  console.warn("Aviso: no hay OPENROUTER_API_KEY, los NPC sólo usarán Ollama.");
}

const casos = cargarCasos("casos");
const puerto = Number(process.env.PUERTO ?? 3000);
crearServidor({ casos, proveedores, dirWeb: "web" }).listen(puerto, () => {
  console.log(`Detective IA en http://localhost:${puerto} (${casos.length} casos)`);
});
