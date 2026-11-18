---
description: Elige con llmfit el modelo local para los NPC, lo prueba y lo configura
agent: build
---
Resultado de llmfit y de la prueba de fidelidad:

!`node scripts/elegir-modelo.ts --aplicar 2>&1 | tail -40`

Explica en español qué modelo se ha elegido y por qué. Comprueba que `opencode.json` y `config/modelos.json` tienen ese modelo. Si ha fallado, di por qué.
