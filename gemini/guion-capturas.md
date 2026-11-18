# Lo que falta por hacer en Gemini (a mano)

Las Gemas sólo se pueden crear en la web, así que esto lo hago yo. Capturas en `entrega/capturas/`.

1. Crear la Gema "Fábrica de Gemas" pegando el texto de `meta-gema.md`. Captura: `gemini-meta-gema.png`.
2. Pedirle la Gema del guionista con los datos del principio de `gema-guionista.md`. Captura de su respuesta: `gemini-meta-salida.png`.
3. Crear la Gema "Guionista de casos" y adjuntar `esquema-caso.md` y `el-cortijo.json`. Captura: `gemini-guionista.png`.
4. Crear la Gema "Abogado del diablo". Captura: `gemini-abogado.png`.
5. Pedirle un caso al guionista y guardar el JSON en `casos/borradores/`. Captura: `gemini-caso.png`.
6. Pasarle el JSON al Abogado del diablo. Captura de su crítica: `gemini-abogado-critica.png`.
7. Pasarlo por `/validar-caso` en OpenCode. Captura: `opencode-validar.png`.
8. Si lo rechaza, pegarle el informe a la Gema y repetir.

Capturas de OpenCode que hacen falta:
- `opencode-plan.png`: modo Plan pensando algo del proyecto, con el contexto y el coste arriba.
- `opencode-build.png`: modo Build haciendo un cambio.
- `opencode-agentes.png`: la lista de agentes (`@`).
- `opencode-comandos.png`: la lista de comandos (`/`).
- `llmfit.png`: la tabla de `llmfit fit`.
