export interface CasoResumen {
  id: string;
  titulo: string;
  introduccion: string;
  dificultad: string;
}

export interface PistaVista {
  id: string;
  nombre: string;
  texto: string;
}

export interface Estado {
  partidaId: string;
  caso: { id: string; titulo: string; ambientacion: string; introduccion: string; victima: string; arma: string; lugarCrimen: string; franja: string };
  lugares: { id: string; nombre: string; abierto: boolean; explorado: boolean; descripcion?: string }[];
  sospechosos: { id: string; nombre: string; perfil: string }[];
  cuaderno: PistaVista[];
  preguntas: number;
  terminada: boolean;
}

export interface Resultado {
  acierto: boolean;
  puntuacion: number;
  explicacion: string;
}

async function pedir<T>(ruta: string, cuerpo?: unknown): Promise<T> {
  const res = await fetch(ruta, cuerpo === undefined ? undefined : { method: "POST", body: JSON.stringify(cuerpo) });
  const datos = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(datos.error ?? "Error desconocido.");
  return datos;
}

export function listarCasos(): Promise<CasoResumen[]> {
  return pedir("/api/casos");
}

export function empezar(casoId: string): Promise<{ partidaId: string; estado: Estado }> {
  return pedir("/api/partidas", { casoId });
}

export function explorar(id: string, lugarId: string): Promise<{ pistasNuevas: PistaVista[]; estado: Estado }> {
  return pedir(`/api/partidas/${id}/explorar`, { lugarId });
}

export function interrogar(id: string, sospechosoId: string, mensaje: string, pistaPresentada?: string): Promise<{ respuesta: string; proveedor: string; pistasNuevas: PistaVista[]; estado: Estado }> {
  return pedir(`/api/partidas/${id}/interrogar`, { sospechosoId, mensaje, pistaPresentada });
}

export function acusar(id: string, culpable: string, pruebas: string[]): Promise<Resultado> {
  return pedir(`/api/partidas/${id}/acusar`, { culpable, pruebas });
}
