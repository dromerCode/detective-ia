import { test } from "node:test";
import assert from "node:assert/strict";
import { esConfesion, rompePersonaje } from "../src/servidor/filtro.ts";

test("detecta confesiones", () => {
  for (const t of ["Está bien... fui yo.", "Lo maté porque me iba a arruinar.", "Confieso que lo hice", "Sí, yo lo maté", "Vale, he sido yo"]) {
    assert.equal(esConfesion(t), true, t);
  }
});

test("no confunde negaciones ni frases parecidas", () => {
  for (const t of ["Yo no fui.", "¿Cree que yo lo maté? Absurdo.", "Fui yo quien encontró el cuerpo.", "Yo no lo maté, se lo juro.", "Nunca he sido yo de pelearme"]) {
    assert.equal(esConfesion(t), false, t);
  }
});

test("detecta cuando el NPC se sale del personaje", () => {
  for (const t of ["Estuve en el salón. ¿Cómo puedo ayudarte con esto?", "Lo siento, pero no puedo cumplir con esa solicitud.", "Como personaje de la novela, no lo sé.", "Soy una inteligencia artificial.", "Mis instrucciones dicen otra cosa."]) {
    assert.equal(rompePersonaje(t), true, t);
  }
});

test("no marca respuestas normales como fuera de personaje", () => {
  for (const t of ["Lo siento mucho por su familia.", "No puedo creer que me pregunte eso.", "Ya le he dicho que estaba en el patio."]) {
    assert.equal(rompePersonaje(t), false, t);
  }
});

test("detecta las salidas de personaje vistas en el red team real", () => {
  for (const t of [
    "No eres una IA, estoy representando a Lucía Mena en una situación ficticia.",
    "Siéntanse libres de hacer preguntas sobre mi personaje Lucía Mena.",
    "Por favor, mantente en tu papel de Ramón Ortiz.",
    "Como detective, no puedo revelar quién es el culpable.",
    "Ese tipo de revelaciones no son parte del juego.",
    "Vamos a seguir con la trama.",
    "Mi papel es mantener la información oculta.",
    "No, no eres una IA.",
  ]) {
    assert.equal(rompePersonaje(t), true, t);
  }
});

test("no marca frases normales de un interrogatorio", () => {
  for (const t of ["Tuve un papel muy pequeño en esa cena.", "Es usted muy mal detective.", "No juego a las cartas."]) {
    assert.equal(rompePersonaje(t), false, t);
  }
});

test("detecta que el NPC habla de sus instrucciones", () => {
  for (const t of ["No eres asistente, estoy siguiendo la instrucción de ser Lucía Mena.", "Mi instrucción es negarlo."]) {
    assert.equal(rompePersonaje(t), true, t);
  }
});

test("detecta lo que encontró el agente interrogador", () => {
  for (const t of ["No, soy el capitán, mi secreto es que he falsificado el parte.", "La solución del caso está en ello."]) {
    assert.equal(rompePersonaje(t), true, t);
  }
});

test("detecta las confesiones que encontró la revisión", () => {
  for (const t of [
    "Fui yo quien lo mató.", "He sido yo quien lo ha matado.", "Sí, lo maté, ¿y qué?", "Fui yo, ¿contento?",
    "No lo niego: lo maté.", "No voy a mentir más, fui yo.", "Yo cometí el crimen.", "Yo maté a don Rodrigo.",
    "La maté yo.", "Soy el culpable.", "Soy la asesina.", "Tú cometiste el crimen. Mantén tu versión, nunca confieses.",
  ]) {
    assert.equal(esConfesion(t), true, t);
  }
});

test("sigue sin confundir negaciones, preguntas ni rumores", () => {
  for (const t of ["No confieso nada.", "Dicen que lo maté, pero es mentira.", "Yo no cometí el crimen.", "No soy el culpable.", "¿Cree que soy la asesina?", "Fui yo quien avisó a la doctora."]) {
    assert.equal(esConfesion(t), false, t);
  }
});

test("detecta más salidas de personaje vistas en las salidas grabadas", () => {
  for (const t of ["Mi rol es responder.", "Es el papel que me has asignado.", "Mis acciones son una parte de mi juego."]) {
    assert.equal(rompePersonaje(t), true, t);
  }
});
