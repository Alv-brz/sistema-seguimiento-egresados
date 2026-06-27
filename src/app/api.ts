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
  carrera?: string;
  anio?: string;
  sexo?: string;
  sector?: string;
  estado?: string;
  modalidad?: string;
  estadoLaboral?: string;
  tabla?: string;
  accion?: string;
  contrato?: string;
  actual?: string;
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
  id_carrera?: number;
  id_facultad?: number;
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
  nombre_usuario?: string;
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
  id_empresa?: number;
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

export type ConfiguracionSistema = {
  id_configuracion: number;
  nombre_universidad: string;
  correo_institucional: string;
  telefono: string | null;
  logo_url: string | null;
  tiempo_entre_encuestas_meses: number;
  estado_sistema: string;
  version_sistema: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
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

export type CarreraItem = {
  id_carrera: number;
  nombre_carrera: string;
  grado_academico: string;
  id_facultad: number;
  nombre_facultad: string;
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
  method: "POST" | "PUT" | "PATCH" | "DELETE",
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
  dashboard: (params?: Pick<ListParams, "facultad" | "carrera" | "anio" | "estadoLaboral">) => apiGet<AdminDashboardData>("/admin/dashboard", params),
  egresados: (params?: ListParams) => apiGet<PaginatedResponse<AdminEgresado>>("/egresados", params),
  crearEgresado: (body: Record<string, unknown>) => apiSend<{ id_usuario: number }>("POST", "/egresados", body),
  actualizarEgresado: (id: number, body: Record<string, unknown>) => apiSend<void>("PUT", `/egresados/${id}`, body),
  cambiarEstadoEgresado: (id: number, estado_usuario: "Activo" | "Inactivo") => apiSend<void>("PATCH", `/egresados/${id}/estado`, { estado_usuario }),
  eliminarEgresado: (id: number) => apiSend<void>("DELETE", `/egresados/${id}`),
  empresas: (params?: ListParams) => apiGet<PaginatedResponse<AdminEmpresa>>("/empresas", params),
  crearEmpresa: (body: Record<string, unknown>) => apiSend<{ id_usuario: number }>("POST", "/empresas", body),
  actualizarEmpresa: (id: number, body: Record<string, unknown>) => apiSend<void>("PUT", `/empresas/${id}`, body),
  cambiarEstadoEmpresa: (id: number, estado_usuario: "Activo" | "Inactivo") => apiSend<void>("PATCH", `/empresas/${id}/estado`, { estado_usuario }),
  eliminarEmpresa: (id: number) => apiSend<void>("DELETE", `/empresas/${id}`),
  ofertas: (params?: ListParams) => apiGet<PaginatedResponse<AdminOferta>>("/ofertas", params),
  actualizarOferta: (id: number, body: Partial<AdminOferta>) => apiSend<void>("PUT", `/ofertas/${id}`, body),
  cambiarEstadoOferta: (id: number, estado_oferta: "Activa" | "Cerrada") => apiSend<void>("PATCH", `/ofertas/${id}/estado`, { estado_oferta }),
  eliminarOferta: (id: number) => apiSend<void>("DELETE", `/ofertas/${id}`),
  encuestas: (params?: ListParams) => apiGet<PaginatedResponse<AdminEncuesta>>("/encuestas", params),
  auditoria: (params?: ListParams) => apiGet<PaginatedResponse<AdminAuditoria>>("/auditoria", params),
  configuracion: () => apiGet<ConfiguracionSistema>("/admin/configuracion"),
  actualizarConfiguracion: (body: Partial<ConfiguracionSistema>) => apiSend<ConfiguracionSistema>("PUT", "/admin/configuracion", body),
  notificaciones: (params?: ListParams) => apiGet<PaginatedResponse<ApiNotificacion>>("/notificaciones", params),
  notificacionesNoLeidas: () => apiGet<{ unread: number }>("/notificaciones/unread-count"),
  marcarNotificacionLeida: (id: number) => apiSend<void>("PATCH", `/notificaciones/${id}/leida`),
  marcarTodasNotificacionesLeidas: () => apiSend<void>("PATCH", "/notificaciones/leer-todas"),
};

export const empresaApi = {
  dashboard: () => apiGet<EmpresaDashboardData>("/empresa/dashboard"),
  ofertas: (params?: ListParams) => apiGet<PaginatedResponse<AdminOferta>>("/empresa/ofertas", params),
  crearOferta: (body: Partial<AdminOferta>) => apiSend<void>("POST", "/empresa/ofertas", body),
  actualizarOferta: (id: number, body: Partial<AdminOferta>) => apiSend<void>("PUT", `/empresa/ofertas/${id}`, body),
  cerrarOferta: (id: number) => apiSend<void>("PATCH", `/empresa/ofertas/${id}/cerrar`),
  cambiarEstadoOferta: (id: number, estado_oferta: "Activa" | "Cerrada") => apiSend<void>("PATCH", `/empresa/ofertas/${id}/estado`, { estado_oferta }),
  eliminarOferta: (id: number) => apiSend<void>("DELETE", `/empresa/ofertas/${id}`),
  postulaciones: (params?: ListParams) => apiGet<PaginatedResponse<EmpresaPostulacion>>("/empresa/postulaciones", params),
  cambiarEstadoPostulacion: (id: number, estado: "Pendiente" | "Aceptado" | "Rechazado") => apiSend<void>("PATCH", `/empresa/postulaciones/${id}/estado`, { estado }),
  perfil: () => apiGet<AdminEmpresa | null>("/empresa/perfil"),
  actualizarPerfil: (body: Partial<AdminEmpresa>) => apiSend<void>("PUT", "/empresa/perfil", body),
  notificaciones: (params?: ListParams) => apiGet<PaginatedResponse<ApiNotificacion>>("/notificaciones", params),
  notificacionesNoLeidas: () => apiGet<{ unread: number }>("/notificaciones/unread-count"),
  marcarNotificacionLeida: (id: number) => apiSend<void>("PATCH", `/notificaciones/${id}/leida`),
  marcarTodasNotificacionesLeidas: () => apiSend<void>("PATCH", "/notificaciones/leer-todas"),
};

export const egresadoApi = {
  dashboard: () => apiGet<EgresadoDashboardData>("/egresado/dashboard"),
  bolsa: (params?: ListParams) => apiGet<PaginatedResponse<AdminOferta>>("/egresado/bolsa", params),
  carreras: () => apiGet<CarreraItem[]>("/egresado/carreras"),
  postulaciones: (params?: ListParams) => apiGet<PaginatedResponse<EgresadoPostulacion>>("/egresado/postulaciones", params),
  postular: (id_oferta: number) => apiSend<void>("POST", "/egresado/postulaciones", { id_oferta }),
  perfil: () => apiGet<EgresadoPerfil | null>("/egresado/perfil"),
  actualizarPerfil: (body: Record<string, unknown>) => apiSend<void>("PUT", "/egresado/perfil", body),
  historial: (params?: ListParams) => apiGet<PaginatedResponse<HistorialLaboralItem>>("/egresado/historial", params),
  crearHistorial: (body: Record<string, unknown>) => apiSend<void>("POST", "/egresado/historial", body),
  actualizarHistorial: (id: number, body: Record<string, unknown>) => apiSend<void>("PUT", `/egresado/historial/${id}`, body),
  eliminarHistorial: (id: number) => apiSend<void>("DELETE", `/egresado/historial/${id}`),
  encuesta: () => apiGet<EgresadoEncuesta | null>("/egresado/encuesta"),
  crearEncuesta: (body: Record<string, unknown>) => apiSend<void>("POST", "/egresado/encuesta", body),
  notificaciones: (params?: ListParams) => apiGet<PaginatedResponse<ApiNotificacion>>("/notificaciones", params),
  notificacionesNoLeidas: () => apiGet<{ unread: number }>("/notificaciones/unread-count"),
  marcarNotificacionLeida: (id: number) => apiSend<void>("PATCH", `/notificaciones/${id}/leida`),
  marcarTodasNotificacionesLeidas: () => apiSend<void>("PATCH", "/notificaciones/leer-todas"),
};
