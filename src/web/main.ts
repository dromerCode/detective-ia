import { acusar, empezar, explorar, interrogar, listarCasos, type Estado, type Resultado } from "./api.ts";

type Hijo = Node | string;
type Linea = { tipo: "detective" | "npc" | "pista"; texto: string };

const app = document.querySelector<HTMLElement>("#app")!;
const aviso = document.querySelector<HTMLElement>("#aviso")!;

let estado: Estado | null = null;
let hablandoCon: string | null = null;
let esperando = false;
let enPartida = false;
const chats = new Map<string, Linea[]>();

function el(etiqueta: string, clase: string, ...hijos: Hijo[]): HTMLElement {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  nodo.append(...hijos);
  return nodo;
}

function boton(texto: string, accion: () => void, clase = "", desactivado = false): HTMLButtonElement {
  const b = el("button", clase, texto) as HTMLButtonElement;
  b.type = "button";
  b.disabled = desactivado;
  b.addEventListener("click", accion);
  return b;
}

function mostrarError(e: unknown): void {
  aviso.textContent = e instanceof Error ? e.message : "Ha pasado algo raro.";
  aviso.hidden = false;
  setTimeout(() => { aviso.hidden = true; }, 5000);
}

function pantalla(...hijos: Hijo[]): void {
  enPartida = false;
  app.replaceChildren(...hijos);
}

async function pantallaCasos(): Promise<void> {
  estado = null;
  hablandoCon = null;
  chats.clear();
  const casos = await listarCasos();
  if (casos.length === 0) {
    pantalla(el("p", "", "No hay ningún caso válido en la carpeta casos/."));
    return;
  }
  pantalla(el("h2", "", "Elige un caso"), ...casos.map((c) => el("article", "tarjeta",
    el("h3", "", c.titulo),
    el("p", "dato", `Dificultad: ${c.dificultad}`),
    el("p", "", c.introduccion),
    boton("Abrir el caso", () => { empezar(c.id).then((r) => { estado = r.estado; pintarPartida(); }).catch(mostrarError); }, "principal"),
  )));
}

function panelLugares(e: Estado): HTMLElement {
  const items = e.lugares.map((l) => el("li", "",
    el("strong", "", l.nombre),
    el("p", "", l.abierto ? l.descripcion ?? "" : "Está cerrado."),
    boton(l.explorado ? "Registrado" : "Registrar", () => {
      explorar(e.partidaId, l.id).then((r) => { estado = r.estado; pintarPartida(); }).catch(mostrarError);
    }, "", !l.abierto || l.explorado),
  ));
  return el("section", "tarjeta", el("h2", "", "Lugares"), el("ul", "lista", ...items));
}

function panelSospechosos(e: Estado): HTMLElement {
  const items = e.sospechosos.map((s) => el("li", "",
    el("strong", "", s.nombre),
    el("p", "", s.perfil),
    boton("Interrogar", () => { hablandoCon = s.id; pintarPartida(); }, "", hablandoCon === s.id),
  ));
  return el("section", "tarjeta", el("h2", "", "Sospechosos"), el("ul", "lista", ...items));
}

function panelCuaderno(e: Estado): HTMLElement {
  const items = e.cuaderno.map((p) => el("li", "", el("strong", "", p.nombre), el("p", "", p.texto)));
  return el("section", "tarjeta",
    el("h2", "", "Cuaderno"),
    items.length ? el("ul", "lista", ...items) : el("p", "dato", "Todavía no tienes pistas."),
    boton("Hacer la acusación", pintarAcusacion, "principal", esperando),
  );
}

function panelChat(e: Estado, sospechosoId: string): HTMLElement {
  const nombre = e.sospechosos.find((s) => s.id === sospechosoId)?.nombre ?? "";
  const lineas = chats.get(sospechosoId) ?? [];
  const chat = el("div", "chat", ...lineas.map((l) => el("div", `burbuja ${l.tipo}`, l.texto)));

  const entrada = document.createElement("input");
  entrada.type = "text";
  entrada.maxLength = 500;
  entrada.placeholder = `Pregúntale a ${nombre}...`;
  entrada.disabled = esperando;

  const selector = document.createElement("select");
  selector.disabled = esperando;
  selector.append(new Option("Sin presentar ninguna pista", ""), ...e.cuaderno.map((p) => new Option(`Presentar: ${p.nombre}`, p.id)));

  const enviar = (): void => {
    const mensaje = entrada.value.trim();
    if (!mensaje || esperando) return;
    lineas.push({ tipo: "detective", texto: mensaje });
    chats.set(sospechosoId, lineas);
    esperando = true;
    pintarPartida();
    interrogar(e.partidaId, sospechosoId, mensaje, selector.value || undefined)
      .then((r) => {
        lineas.push({ tipo: "npc", texto: r.respuesta });
        for (const p of r.pistasNuevas) lineas.push({ tipo: "pista", texto: `Nueva pista: ${p.nombre}. ${p.texto}` });
        estado = r.estado;
      })
      .catch(mostrarError)
      .finally(() => {
        esperando = false;
        if (enPartida) pintarPartida();
      });
  };
  entrada.addEventListener("keydown", (ev) => { if (ev.key === "Enter") enviar(); });

  const seccion = el("section", "tarjeta",
    el("h2", "", `Interrogatorio: ${nombre}`),
    chat,
    esperando ? el("p", "dato", `${nombre} está pensando...`) : "",
    el("div", "formulario", selector, entrada, boton("Preguntar", enviar, "", esperando)),
  );
  queueMicrotask(() => { chat.scrollTop = chat.scrollHeight; if (!esperando) entrada.focus(); });
  return seccion;
}

function pintarPartida(): void {
  if (!estado) return;
  const e = estado;
  pantalla(
    el("section", "tarjeta",
      el("h2", "", e.caso.titulo),
      el("p", "", e.caso.introduccion),
      el("p", "dato", `Víctima: ${e.caso.victima}. Arma: ${e.caso.arma}. Lugar: ${e.caso.lugarCrimen}. Hora: ${e.caso.franja}. Preguntas hechas: ${e.preguntas}.`),
    ),
    hablandoCon ? panelChat(e, hablandoCon) : "",
    el("div", "columnas", panelLugares(e), panelSospechosos(e), panelCuaderno(e)),
  );
  enPartida = true;
}

function opcion(tipo: "radio" | "checkbox", nombre: string, valor: string, texto: string): HTMLElement {
  const i = document.createElement("input");
  i.type = tipo;
  i.name = nombre;
  i.value = valor;
  return el("label", "opcion", i, ` ${texto}`);
}

function pintarAcusacion(): void {
  if (!estado) return;
  const e = estado;
  const formulario = el("form", "",
    el("h3", "", "¿Quién es el culpable?"),
    ...e.sospechosos.map((s) => opcion("radio", "culpable", s.id, s.nombre)),
    el("h3", "", "¿Qué pruebas presentas?"),
    ...(e.cuaderno.length ? e.cuaderno.map((p) => opcion("checkbox", "prueba", p.id, p.nombre)) : [el("p", "dato", "No tienes pistas.")]),
    boton("Acusar", () => {
      const culpable = formulario.querySelector<HTMLInputElement>("input[name=culpable]:checked")?.value;
      if (!culpable) { mostrarError(new Error("Tienes que elegir a alguien.")); return; }
      const pruebas = [...formulario.querySelectorAll<HTMLInputElement>("input[name=prueba]:checked")].map((i) => i.value);
      acusar(e.partidaId, culpable, pruebas).then(pintarResultado).catch(mostrarError);
    }, "principal"),
    " ",
    boton("Volver a investigar", pintarPartida),
  );
  pantalla(el("section", "tarjeta", el("h2", "", "Acusación"), el("p", "dato", "Ojo: sólo puedes acusar una vez."), formulario));
}

function pintarResultado(r: Resultado): void {
  pantalla(el("section", "tarjeta",
    el("h2", "", r.acierto ? "Caso resuelto" : "Has acusado a la persona equivocada"),
    el("p", "", `Puntuación: ${r.puntuacion}`),
    el("p", "", r.explicacion),
    boton("Volver a los casos", () => { pantallaCasos().catch(mostrarError); }, "principal"),
  ));
}

pantallaCasos().catch(mostrarError);
