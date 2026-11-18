import { readFileSync } from "node:fs";
import type { Caso } from "../src/caso/tipos.ts";

const base: Caso = JSON.parse(readFileSync(new URL("../casos/el-cortijo.json", import.meta.url), "utf8")) as Caso;

export function casoValido(): Caso {
  return structuredClone(base);
}

export function romper(mutar: (c: Caso) => void): Caso {
  const caso = casoValido();
  mutar(caso);
  return caso;
}
