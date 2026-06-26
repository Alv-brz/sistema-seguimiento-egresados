import { readStoredSession } from "./auth";

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3001/api").replace(/\/$/, "");

type ApiSuccess<T> = {
  ok: true;
  data: T;
};

type ApiFailure = {
  ok: false;
  reason?: string;
  error?: string;
};

export type AdminDashboardData = {
  counts: {
    totalEgresados: number;
    totalEmpresas: number;
    totalOfertas: number;
    ofertasActivas: number;
    totalPostulaciones: number;
    totalEncuestas: number;
  };
  charts: {
    egresadosPorCarrera: { name: string; egresados: number }[];
    egresadosPorFacultad: { name: string; value: number; color: string }[];
    estadoLaboral: { name: string; value: number; color: string }[];
    ofertasHistorial: { mes: string; activas: number; cerradas: number }[];
    postulacionesEvolucion: { mes: string; postulaciones: number }[];
  };
};

export type AdminEgresado = {
  id_usuario: number;
  dni: string;
  nombre_egresado: string;
  apellidos_egresado: string;
  telefono: string | null;
  direccion: string | null;
  fecha_egreso: string;
  sexo: string;
  nombre_carrera: string;
  grado_academico: string;
  nombre_facultad: string;
  nombre_usuario: string;
  correo: string;
  estado_usuario: string;
  fecha_creacion: string;
  ultimo_acceso: string | null;
};

export type AdminEmpresa = {
  id_usuario: number;
  ruc: string;
  razon_social: string;
  nombre_comercial: string | null;
  sector: string;
  direccion: string;
  telefono: string | null;
  pagina_web: string | null;
  correo: string;
  estado_usuario: string;
};

export type AdminOferta = {
  id_oferta: number;
  titulo: string;
  descripcion: string;
  puesto: string;
  area: string;
  ubicacion: string;
  modalidad: string;
  tipo_contrato: string;
  salario: number | null;
  requisitos: string | null;
  fecha_publicacion: string;
  fecha_cierre: string;
  estado_oferta: string;
  empresa: string;
};

export type AdminEncuesta = {
  id_encuesta: number;
  fecha_registro: string;
  estado_laboral: string;
  nombre_empresa_actual: string | null;
  cargo_actual: string | null;
  area_trabajo: string | null;
  sueldo_mensual: number | null;
  tipo_contrato: string | null;
  satisfaccion_profesional: string | null;
  tiempo_conseguir_empleo: string | null;
  observaciones: string | null;
  egresado: string;
  fecha_asociacion: string;
};

export type AdminAuditoria = {
  id_auditoria: number;
  tabla_afectada: string;
  accion: string;
  id_registro: number;
  descripcion: string | null;
  fecha_evento: string;
  usuario_bd: string | null;
};

export type ApiNotificacion = {
  id_notificacion: number;
  id_usuario: number;
  titulo: string;
  mensaje: string;
  leido: boolean | number;
  fecha_envio: string;
};

export class ApiError extends Error {
  status: number;
  reason?: string;

  constructor(status: number, message: string, reason?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.reason = reason;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const session = readStoredSession();
  const headers: HeadersInit = { "Content-Type": "application/json" };

  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { headers });
  const payload = (await response.json()) as ApiSuccess<T> | ApiFailure;

  if (!response.ok || payload.ok !== true) {
    throw new ApiError(
      response.status,
      payload.error ?? payload.reason ?? "Error al consumir la API.",
      payload.reason
    );
  }

  return payload.data;
}

export const adminApi = {
  dashboard: () => apiGet<AdminDashboardData>("/admin/dashboard"),
  egresados: () => apiGet<AdminEgresado[]>("/egresados"),
  empresas: () => apiGet<AdminEmpresa[]>("/empresas"),
  ofertas: () => apiGet<AdminOferta[]>("/ofertas"),
  encuestas: () => apiGet<AdminEncuesta[]>("/encuestas"),
  auditoria: () => apiGet<AdminAuditoria[]>("/auditoria"),
  notificaciones: () => apiGet<ApiNotificacion[]>("/notificaciones"),
};
