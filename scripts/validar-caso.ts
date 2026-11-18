// Uso: node scripts/validar-caso.ts <archivo.json...> | --todos   [--json]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { verificarCaso } from "../src/caso/verificador.ts";
import type { Informe } from "../src/caso/tipos.ts";

interface Resultado extends Informe {
  archivo: string;
}

function validarArchivo(archivo: string): Resultado {
  let datos: unknown;
  try {
    datos = JSON.parse(readFileSync(archivo, "utf8"));
  } catch {
    return { archivo, valido: false, avisos: [], errores: [{ codigo: "E_JSON", mensaje: "El archivo no existe o no es un JSON válido." }] };
  }
  return { archivo, ...verificarCaso(datos) };
}

function imprimir(r: Resultado): void {
  console.log(`${r.valido ? "✓ APROBADO" : "✗ RECHAZADO"}  ${r.archivo}`);
  for (const e of r.errores) console.log(`  ✗ ${e.codigo}: ${e.mensaje}`);
  for (const a of r.avisos) console.log(`  ! ${a.codigo}: ${a.mensaje}`);
}

const args = process.argv.slice(2);
const json = args.includes("--json");
let archivos = args.filter((a) => !a.startsWith("--"));
if (args.includes("--todos")) {
  archivos = readdirSync("casos").filter((f) => f.endsWith(".json")).sort().map((f) => join("casos", f));
}
if (archivos.length === 0) {
  console.error("Uso: node scripts/validar-caso.ts <archivo.json...> | --todos [--json]");
  process.exit(2);
}

const resultados = archivos.map(validarArchivo);
if (json) console.log(JSON.stringify(resultados, null, 2));
else resultados.forEach(imprimir);
process.exit(resultados.every((r) => r.valido) ? 0 : 1);
