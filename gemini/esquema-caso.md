# Esquema de un caso de Detective IA

Un caso es un JSON con estos campos:

- `id`: texto en minúsculas con guiones. `titulo`, `ambientacion`, `introduccion`: textos.
- `dificultad`: `facil`, `media` o `dificil`.
- `crimen`: `victima`, `lugar` (id), `arma`, `desde`, `hasta` (HH:MM).
- `lugares`: lista de `{ id, nombre, descripcion, requiere? }`. `requiere` es el id de la pista que abre ese lugar.
- `sospechosos`: lista de `{ id, nombre, perfil, personalidad, secreto, coartada: { lugar, desde, hasta, testigo? }, mienteCoartada, conoce: [ids de hechos], respuestaReserva }`.
- `hechos`: lista de uno de estos tres tipos:
  - `{ id, tipo: "presencia", sujeto, lugar, desde, hasta }`
  - `{ id, tipo: "acceso_arma", sujeto, valor }`
  - `{ id, tipo: "movil", sujeto, valor, descripcion }`
- `pistas`: lista de `{ id, nombre, texto, revela: [ids de hechos], origen }`. `revela` puede estar vacío. `origen` es:
  - `{ tipo: "lugar", lugar }`
  - `{ tipo: "testimonio", sospechoso, requiere: [ids de pistas] }`
- `solucion`: `{ culpable, pruebasClave: [ids de pistas], explicacion }`.

Todos los ids son únicos en todo el caso.

## Reglas que comprueba el verificador

| Código | Qué significa |
|---|---|
| `E_ESTRUCTURA` | Falta un campo o tiene un tipo incorrecto |
| `E_ID_DUPLICADO` | Id repetido |
| `E_REFERENCIA` | Un id apunta a algo que no existe |
| `E_HORA` | Hora mal escrita o `desde` no es anterior a `hasta` |
| `E_PISTA_INALCANZABLE` | Una prueba clave no se puede conseguir |
| `E_UBICUIDAD` | Alguien está en dos sitios a la vez |
| `E_COARTADA_NO_MARCADA` | La coartada choca con un hecho y no tiene `mienteCoartada: true` |
| `E_MENTIRA_SIN_CHOQUE` | `mienteCoartada: true` sin ningún hecho que la contradiga |
| `E_SOLUCION_NO_UNICA` | No se puede descartar a algún inocente |
| `E_CULPABLE_DESCARTADO` | Las pistas descartan al culpable |
| `E_CULPABLE_NO_PROBADO` | Falta oportunidad, medio o móvil contra el culpable |
| `E_PRUEBAS_INSUFICIENTES` | Las pruebas clave no bastan |
| `E_PRUEBA_DECORATIVA` | Una prueba clave sobra |
| `E_SPOILER` | Un texto público señala al culpable |
| `E_TESTIMONIO_SIN_REQUISITOS` | Un testimonio no requiere ninguna pista, y sin presentar una no sale nunca |
| `E_TESTIMONIO_CULPABLE` | El culpable da un testimonio contra sí mismo |
| `E_RESERVA_DELATA` | La frase de reserva nombra a otro sospechoso o confiesa |
| `E_SECRETO_CRIMEN` | El secreto de un sospechoso habla del crimen en vez de ser una pista falsa |

## Lógica

- **Descartado**: una pista revela presencia en otro lugar durante TODA la franja del crimen, o `acceso_arma: false`, o `movil: false`.
- **Probado**: una pista revela presencia en el lugar del crimen durante parte de la franja, `acceso_arma: true` y `movil: true`.

Tiene que quedar un único sospechoso sin descartar, que sea el culpable y esté probado.
