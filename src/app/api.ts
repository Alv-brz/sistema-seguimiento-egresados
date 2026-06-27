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

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  facultad?: string;
  sexo?: string;
  sector?: string;
  estado?: string;
  modalidad?: string;
  estadoLaboral?: string;
  tabla?: string;
  accion?: string;
  contrato?: string;
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

export type EmpresaPostulacion = {
  id_postulacion: number;
  egresado: string;
  carrera: string;
  oferta: string;
  empresa: string;
  fecha_postulacion: string;
  estado_postulacion: string;
  observaciones: string | null;
  cv_adjunto: string | null;
};

export type EmpresaDashboardData = {
  profile: AdminEmpresa | null;
  counts: {
    totalOfertas: number;
    ofertasActivas: number;
    ofertasCerradas: number;
    totalPostulaciones: number;
    postulacionesPendientes: number;
    postulacionesAceptadas: number;
    postulacionesRechazadas: number;
    postulacionesEnProceso: number;
  };
  ofertasActivas: AdminOferta[];
  ultimasPostulaciones: EmpresaPostulacion[];
};

export type EgresadoPerfil = AdminEgresado;

export type EgresadoPostulacion = {
  id_postulacion: number;
  oferta: string;
  empresa: string;
  fecha_postulacion: string;
  estado_postulacion: string;
  observaciones: string | null;
  cv_adjunto: string | null;
};

export type HistorialLaboralItem = {
  id_historial: number;
  nombre_empresa: string;
  cargo: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  salario: number | null;
  modalidad: string;
  actual: boolean | number;
};

export type EgresadoEncuesta = {
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
  fecha_asociacion: string;
  proxima_disponible: string;
  can_submit: boolean | number;
};

export type EgresadoDashboardData = {
  profile: EgresadoPerfil | null;
  metrics: {
    totalPostulaciones: number;
    estadoLaboralActual: string;
    ultimaEmpresa: string;
    ofertasActivas: number;
    historialRegistrado: boolean;
    encuestaCompletada: boolean;
  };
  ofertasRecomendadas: AdminOferta[];
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

function buildHeaders() {
  const session = readStoredSession();
  const headers: HeadersInit = { "Content-Type": "application/json" };

  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  return headers;
}

export async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const headers = buildHeaders();
  const query = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });

  const url = `${API_BASE_URL}${path}${query.size > 0 ? `?${query.toString()}` : ""}`;
  const response = await fetch(url, { headers });
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

export async function apiSend<T>(
  method: "POST" | "PUT" | "PATCH",
  path: string,
  body?: unknown
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: buildHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json()) as ApiSuccess<T> | ApiFailure;

  if (!response.ok || payload.ok !== true) {
    throw new ApiError(
      response.status,
      payload.error ?? payload.reason ?? "Error al consumir la API.",
      payload.reason
    );
  }

  return "data" in payload ? payload.data : (undefined as T);
}

export const adminApi = {
  dashboard: () => apiGet<AdminDashboardData>("/admin/dashboard"),
  egresados: (params?: ListParams) => apiGet<PaginatedResponse<AdminEgresado>>("/egresados", params),
  empresas: (params?: ListParams) => apiGet<PaginatedResponse<AdminEmpresa>>("/empresas", params),
  ofertas: (params?: ListParams) => apiGet<PaginatedResponse<AdminOferta>>("/ofertas", params),
  encuestas: (params?: ListParams) => apiGet<PaginatedResponse<AdminEncuesta>>("/encuestas", params),
  auditoria: (params?: ListParams) => apiGet<PaginatedResponse<AdminAuditoria>>("/auditoria", params),
  notificaciones: (params?: ListParams) => apiGet<PaginatedResponse<ApiNotificacion>>("/notificaciones", params),
};

export const empresaApi = {
  dashboard: () => apiGet<EmpresaDashboardData>("/empresa/dashboard"),
  ofertas: (params?: ListParams) => apiGet<PaginatedResponse<AdminOferta>>("/empresa/ofertas", params),
  crearOferta: (body: Partial<AdminOferta>) => apiSend<void>("POST", "/empresa/ofertas", body),
  actualizarOferta: (id: number, body: Partial<AdminOferta>) => apiSend<void>("PUT", `/empresa/ofertas/${id}`, body),
  cerrarOferta: (id: number) => apiSend<void>("PATCH", `/empresa/ofertas/${id}/cerrar`),
  postulaciones: (params?: ListParams) => apiGet<PaginatedResponse<EmpresaPostulacion>>("/empresa/postulaciones", params),
  cambiarEstadoPostulacion: (id: number, estado: "Pendiente" | "Aceptado" | "Rechazado") => apiSend<void>("PATCH", `/empresa/postulaciones/${id}/estado`, { estado }),
  perfil: () => apiGet<AdminEmpresa | null>("/empresa/perfil"),
  actualizarPerfil: (body: Partial<AdminEmpresa>) => apiSend<void>("PUT", "/empresa/perfil", body),
  notificaciones: (params?: ListParams) => apiGet<PaginatedResponse<ApiNotificacion>>("/notificaciones", params),
};

export const egresadoApi = {
  dashboard: () => apiGet<EgresadoDashboardData>("/egresado/dashboard"),
  bolsa: (params?: ListParams) => apiGet<PaginatedResponse<AdminOferta>>("/egresado/bolsa", params),
  postulaciones: (params?: ListParams) => apiGet<PaginatedResponse<EgresadoPostulacion>>("/egresado/postulaciones", params),
  perfil: () => apiGet<EgresadoPerfil | null>("/egresado/perfil"),
  historial: (params?: ListParams) => apiGet<PaginatedResponse<HistorialLaboralItem>>("/egresado/historial", params),
  encuesta: () => apiGet<EgresadoEncuesta | null>("/egresado/encuesta"),
  notificaciones: (params?: ListParams) => apiGet<PaginatedResponse<ApiNotificacion>>("/notificaciones", params),
};
