import { test } from "node:test";
import assert from "node:assert/strict";
import { aMinutos, solapan, cubre } from "../src/caso/horas.ts";

test("aMinutos convierte HH:MM y rechaza horas inválidas", () => {
  assert.equal(aMinutos("22:30"), 1350);
  assert.equal(aMinutos("00:00"), 0);
  assert.equal(aMinutos("25:00"), null);
  assert.equal(aMinutos("9:5"), null);
});

test("solapan usa intervalos semiabiertos", () => {
  assert.equal(solapan({ desde: "22:00", hasta: "22:30" }, { desde: "22:30", hasta: "23:00" }), false);
  assert.equal(solapan({ desde: "22:00", hasta: "22:31" }, { desde: "22:30", hasta: "23:00" }), true);
});

test("cubre exige contener el intervalo entero", () => {
  assert.equal(cubre({ desde: "21:00", hasta: "23:00" }, { desde: "22:00", hasta: "22:30" }), true);
  assert.equal(cubre({ desde: "22:10", hasta: "23:00" }, { desde: "22:00", hasta: "22:30" }), false);
});
