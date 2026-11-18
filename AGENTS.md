# AGENTS.md

## Project

Detective IA: juego web de misterio. Los casos se diseñan con Gemas de Gemini, se validan con un verificador lógico y agentes de OpenCode, y los NPC los mueve Ollama con respaldo en OpenRouter. `src/payments` es un ejercicio anterior: no se toca.

## Layout

- `opencode.json`: providers y modelos. `permission.external_directory: "deny"` no se relaja sin aprobación.
- `config/modelos.json`: modelos de los NPC. Lo actualiza `/elegir-modelo`.
- `src/caso/`: tipos, horas y verificador (sin E/S).
- `src/juego/partida.ts`: reglas de la partida (sin E/S).
- `src/servidor/`: API HTTP, NPC, proveedores LLM y filtros.
- `src/web/` y `web/`: cliente. `npm run build:web` compila a `web/js/`.
- `scripts/`: `validar-caso.ts`, `probar-npc.ts`, `elegir-modelo.ts`.
- `casos/`: casos aprobados. `casos/borradores/`: pendientes de validar.
- `gemini/`: Meta-Gema, Gemas y esquema del caso.
- `.opencode/agents/`: guionista, verificador, interrogador, prompt-engineer.
- `.opencode/commands/`: elegir-modelo, nuevo-caso, validar-caso, probar-npc, verificar-todo, refactor.

## Flujo de un caso

Borrador (Gema o agente guionista) -> `/validar-caso` -> correcciones -> `/probar-npc` -> copiar a `casos/`. Un caso nunca pasa a `casos/` si el verificador lo rechaza.

## Environment

- OpenCode 2.2, Node 26 con type stripping (se ejecuta `.ts` directamente), Linux.
- La key de OpenRouter está en la config global de OpenCode. El juego la lee de `OPENROUTER_API_KEY`. Nunca se escribe en el repo.

## Conventions

- ESM con imports con extensión `.ts`. Sólo sintaxis borrable: sin `enum`, `namespace` ni parameter properties.
- `opencode.json` es JSON estricto y conserva `$schema`.
- Única dependencia de producción: ninguna. Sólo `typescript` y `@types/node` para desarrollo.
- Lo que un NPC no debe contar no entra en su prompt.

## Verification

```sh
npm run verificar
```

Comprueba tipos, tests y todos los casos de `casos/`. Con OpenCode: `/verificar-todo`.

## Reglas Estrictas del Proyecto
- Toda función debe incluir tipos explícitos en TypeScript.
- Queda estrictamente prohibido usar el tipo `any`.
- Todos los mensajes de error deben devolverse en español.
