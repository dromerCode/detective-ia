---
description: Crea un caso nuevo con el guionista y lo valida hasta aprobarlo
agent: build
---
Crea un caso nuevo con este tema: $ARGUMENTS

1. Pide al subagente @guionista que lo escriba en `casos/borradores/`.
2. Pide al subagente @verificador el veredicto.
3. Si es RECHAZADO, pasa las correcciones a @guionista y repite. Máximo 3 vueltas.
4. Si es APROBADO, pide a @interrogador que pruebe los NPC del borrador.
5. Sólo si @interrogador también lo aprueba, copia el archivo a `casos/`.

Si tras 3 vueltas sigue rechazado, o si @interrogador lo rechaza, para y enseña el último informe: no copies el caso a `casos/`. Termina con un resumen de cada vuelta en español.
