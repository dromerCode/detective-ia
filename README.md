# Detective IA

Juego web de misterio. Eliges un caso, registras lugares, interrogas a los sospechosos y acusas al culpable con pruebas.

## Cómo se arranca

Hace falta Node 26 y Ollama.

```sh
npm install
npm run build:web
ollama pull qwen2.5:3b
npm start
```

Y se abre http://localhost:3000.

Si quieres OpenRouter de respaldo, arranca con `OPENROUTER_API_KEY=tu_key npm start`.

## Comprobar que todo está bien

```sh
npm run verificar
```

## Carpetas

- `casos/`: los casos que se pueden jugar (tres disponibles: **Expreso de Aragón**, **El Cortijo**, **Crucero Mediterráneo 1962**).
- `gemini/`: prompts de la Meta-Gema y las Gemas.
- `.opencode/`: agentes y comandos de OpenCode.
- `src/`: código del juego.
- `scripts/`: validar casos, probar los NPC y elegir modelo.
- `entrega/`: memoria y capturas.
