export type Dificultad = "facil" | "media" | "dificil";

export interface Crimen {
  victima: string;
  lugar: string;
  arma: string;
  desde: string;
  hasta: string;
}

export interface Lugar {
  id: string;
  nombre: string;
  descripcion: string;
  requiere?: string;
}

export interface Coartada {
  lugar: string;
  desde: string;
  hasta: string;
  testigo?: string;
}

export interface Sospechoso {
  id: string;
  nombre: string;
  perfil: string;
  personalidad: string;
  secreto: string;
  coartada: Coartada;
  mienteCoartada: boolean;
  conoce: string[];
  respuestaReserva: string;
}

export type Hecho =
  | { id: string; tipo: "presencia"; sujeto: string; lugar: string; desde: string; hasta: string }
  | { id: string; tipo: "acceso_arma"; sujeto: string; valor: boolean }
  | { id: string; tipo: "movil"; sujeto: string; valor: boolean; descripcion: string };

export type OrigenPista =
  | { tipo: "lugar"; lugar: string }
  | { tipo: "testimonio"; sospechoso: string; requiere: string[] };

export interface Pista {
  id: string;
  nombre: string;
  texto: string;
  revela: string[];
  origen: OrigenPista;
}

export interface Solucion {
  culpable: string;
  pruebasClave: string[];
  explicacion: string;
}

export interface Caso {
  id: string;
  titulo: string;
  ambientacion: string;
  introduccion: string;
  dificultad: Dificultad;
  crimen: Crimen;
  lugares: Lugar[];
  sospechosos: Sospechoso[];
  hechos: Hecho[];
  pistas: Pista[];
  solucion: Solucion;
}

export interface Problema {
  codigo: string;
  mensaje: string;
}

export interface Informe {
  valido: boolean;
  errores: Problema[];
  avisos: Problema[];
}
