import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";
import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";
import {
  LayoutDashboard, Users, Building2, Briefcase, ClipboardList, BarChart2,
  Settings, Bell, Search, LogOut, Eye, Edit2, Trash2, Plus, FileText,
  GraduationCap, MapPin, DollarSign, Calendar, Filter, User, Lock,
  CheckCircle, AlertCircle, Clock, Download, Upload, Info, X,
  ShieldCheck, RefreshCw,
} from "lucide-react";
import {
  authenticateUser,
  clearSession,
  getDemoCredentials,
  getDemoSession,
  readStoredSession,
  saveSession,
  validateStoredSession,
  type AuthRole,
  type AuthSession,
} from "./auth";
import {
  adminApi,
  egresadoApi,
  empresaApi,
  type AdminAuditoria,
  type AdminDashboardData,
  type AdminEgresado,
  type AdminEmpresa,
  type AdminEncuesta,
  type AdminOferta,
  type ApiNotificacion,
  type CarreraItem,
  type ConfiguracionSistema,
  type EmpresaDashboardData,
  type EmpresaPostulacion,
  type EgresadoDashboardData,
  type EgresadoEncuesta,
  type EgresadoPerfil,
  type EgresadoPostulacion,
  type HistorialLaboralItem,
  type PaginatedResponse,
  type SqlEvidenceObject,
  type SqlEvidenceOverview,
  type SqlRunResult,
} from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────
type Role = AuthRole;
type Screen =
  | "login"
  | "admin-dashboard" | "admin-egresados" | "admin-empresas"
  | "admin-ofertas" | "admin-encuestas" | "admin-reportes" | "admin-config"
  | "admin-auditoria" | "admin-sql-evidencias"
  | "emp-dashboard" | "emp-crear-oferta" | "emp-postulaciones" | "emp-perfil"
  | "egr-dashboard" | "egr-bolsa" | "egr-postulaciones" | "egr-encuesta"
  | "egr-perfil" | "egr-historial"
  | "notificaciones";

const HOME_BY_ROLE: Record<Role, Screen> = { admin: "admin-dashboard", empresa: "emp-dashboard", egresado: "egr-dashboard" };
const LAST_SCREEN_STORAGE_PREFIX = "seg_egresado_bolsa.last_screen.";

const ROLE_SCREENS: Record<Role, Set<Screen>> = {
  admin: new Set([
    "admin-dashboard", "admin-egresados", "admin-empresas", "admin-ofertas",
    "admin-encuestas", "admin-reportes", "admin-config", "admin-auditoria", "admin-sql-evidencias", "notificaciones",
  ]),
  empresa: new Set([
    "emp-dashboard", "emp-crear-oferta", "emp-postulaciones", "emp-perfil", "admin-ofertas", "notificaciones",
  ]),
  egresado: new Set([
    "egr-dashboard", "egr-bolsa", "egr-postulaciones", "egr-encuesta",
    "egr-perfil", "egr-historial", "notificaciones",
  ]),
};

function canAccessScreen(role: Role, screen: Screen) {
  return ROLE_SCREENS[role].has(screen);
}

function lastScreenStorageKey(role: Role) {
  return `${LAST_SCREEN_STORAGE_PREFIX}${role}`;
}

function readLastScreenForRole(role: Role): Screen {
  const storedScreen = localStorage.getItem(lastScreenStorageKey(role)) as Screen | null;
  return storedScreen && canAccessScreen(role, storedScreen) ? storedScreen : HOME_BY_ROLE[role];
}

function saveLastScreenForRole(role: Role, screen: Screen) {
  const validScreen = canAccessScreen(role, screen) ? screen : HOME_BY_ROLE[role];
  localStorage.setItem(lastScreenStorageKey(role), validScreen);
}

function displaySessionName(session: AuthSession) {
  return session.nombre_usuario || session.role;
}

function sessionInitials(session: AuthSession) {
  const clean = displaySessionName(session).trim();
  const parts = clean.split(/[.\s_-]+/).filter(Boolean);
  const initials = parts.length > 1
    ? `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`
    : clean.slice(0, 2);
  return initials.toUpperCase() || "UD";
}

function websiteHref(value: string | null | undefined) {
  const clean = String(value ?? "").trim();
  if (!clean) return null;
  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
}

// ─── Mock Data (aligned with BD seg_egresado_bolsa) ──────────────────────────

// tabla: facultad (10 registros del INSERT)
const FACULTADES = [
  "Facultad de Ingeniería", "Facultad de Medicina", "Facultad de Derecho",
  "Facultad de Educación", "Facultad de Arquitectura", "Facultad de Administración",
  "Facultad de Psicología", "Facultad de Economía", "Facultad de Enfermería",
  "Facultad de Ciencias Sociales",
];

// tabla: carrera (muestra por facultad)
const CARRERAS: Record<string, string[]> = {
  "Facultad de Ingeniería": ["Ingeniería de Sistemas", "Ingeniería Civil", "Ingeniería Industrial", "Ingeniería Ambiental", "Ingeniería Mecánica"],
  "Facultad de Medicina": ["Medicina Humana", "Nutrición", "Obstetricia", "Tecnología Médica", "Farmacia"],
  "Facultad de Derecho": ["Derecho Penal", "Derecho Civil", "Derecho Corporativo", "Derecho Constitucional", "Derecho Internacional"],
  "Facultad de Educación": ["Educación Inicial", "Educación Primaria", "Educación Física", "Psicopedagogía", "Educación Secundaria"],
  "Facultad de Arquitectura": ["Arquitectura", "Urbanismo", "Diseño de Interiores", "Arquitectura Sostenible", "Diseño Arquitectónico"],
  "Facultad de Administración": ["Administración", "Marketing", "Negocios Internacionales", "Recursos Humanos", "Gestión Pública"],
  "Facultad de Psicología": ["Psicología Clínica", "Psicología Organizacional", "Psicología Educativa", "Psicología Social", "Neuropsicología"],
  "Facultad de Economía": ["Economía", "Finanzas", "Contabilidad", "Auditoría", "Economía Internacional"],
  "Facultad de Enfermería": ["Enfermería General", "Enfermería Pediátrica", "Enfermería Quirúrgica", "Salud Comunitaria", "Emergencias Médicas"],
  "Facultad de Ciencias Sociales": ["Sociología", "Trabajo Social", "Comunicación Social", "Antropología", "Ciencias Políticas"],
};

// Muestra local de egresados para fallback de la UI.
const EGRESADOS = [
  { id_usuario: 1, dni: "30062065", nombre_egresado: "Bartolomé Pilar", apellidos_egresado: "Vicente Abascal", telefono: "944672125", direccion: "Calle Moreno Hervia 592, Lugo, 33354", fecha_egreso: "2026-03-12", sexo: "M", nombre_carrera: "Auditoría", nombre_facultad: "Facultad de Economía", grado_academico: "Bachiller", nombre_usuario: "bartolomé.vicente85683", correo: "bartolomé.vicente85683@gmail.com", estado_usuario: "Activo", fecha_creacion: "2024-09-15 08:02:48", ultimo_acceso: "2026-02-23 09:02:08" },
  { id_usuario: 2, dni: "20111881", nombre_egresado: "Florencia Lourdes", apellidos_egresado: "Montesinos Borrego", telefono: "922235739", direccion: "Glorieta de Pastora Arnaiz 38, Barcelona, 20904", fecha_egreso: "2024-08-22", sexo: "F", nombre_carrera: "Economía Internacional", nombre_facultad: "Facultad de Economía", grado_academico: "Bachiller", nombre_usuario: "florencia.montesinos46177", correo: "florencia.montesinos46177@hotmail.com", estado_usuario: "Activo", fecha_creacion: "2024-12-11 20:28:04", ultimo_acceso: "2025-04-30 16:32:19" },
  { id_usuario: 3, dni: "15414145", nombre_egresado: "Rosario Pascuala", apellidos_egresado: "Barral Vergara", telefono: "961976628", direccion: "C. Faustino Posada 9, Málaga, 04621", fecha_egreso: "2023-06-26", sexo: "M", nombre_carrera: "Diseño de Interiores", nombre_facultad: "Facultad de Arquitectura", grado_academico: "Bachiller", nombre_usuario: "rosario.barral13005", correo: "rosario.barral13005@hotmail.com", estado_usuario: "Activo", fecha_creacion: "2024-12-12 19:16:45", ultimo_acceso: "2025-11-06 05:12:37" },
  { id_usuario: 4, dni: "10604574", nombre_egresado: "Flavio Cornelio", apellidos_egresado: "Álamo Pino", telefono: "967162744", direccion: "Vial de Rosalinda Blanch 5, Huesca, 10857", fecha_egreso: "2023-09-19", sexo: "M", nombre_carrera: "Sociología", nombre_facultad: "Facultad de Ciencias Sociales", grado_academico: "Bachiller", nombre_usuario: "flavio.álamo80897", correo: "flavio.álamo80897@yahoo.com", estado_usuario: "Activo", fecha_creacion: "2023-10-11 02:38:28", ultimo_acceso: "2025-03-21 13:32:59" },
  { id_usuario: 5, dni: "26310357", nombre_egresado: "Nadia Silvia", apellidos_egresado: "Agullo Goicoechea", telefono: "959546370", direccion: "Cañada de Cecilia Tur 76, Baleares, 42382", fecha_egreso: "2024-01-21", sexo: "F", nombre_carrera: "Psicología Clínica", nombre_facultad: "Facultad de Psicología", grado_academico: "Bachiller", nombre_usuario: "nadia.agullo91904", correo: "nadia.agullo91904@gmail.com", estado_usuario: "Activo", fecha_creacion: "2025-09-09 17:05:06", ultimo_acceso: "2026-02-12 22:07:52" },
  { id_usuario: 6, dni: "45110677", nombre_egresado: "Angélica Arsenio", apellidos_egresado: "Pujol Carranza", telefono: "936180668", direccion: "Calle de Ale Gabaldón 14, Zaragoza, 21413", fecha_egreso: "2021-06-26", sexo: "F", nombre_carrera: "Enfermería Quirúrgica", nombre_facultad: "Facultad de Enfermería", grado_academico: "Bachiller", nombre_usuario: "angélica.pujol44047", correo: "angélica.pujol44047@outlook.com", estado_usuario: "Activo", fecha_creacion: "2023-11-22 01:48:52", ultimo_acceso: "2023-12-19 09:11:46" },
  { id_usuario: 7, dni: "53831244", nombre_egresado: "Carla Plácido", apellidos_egresado: "Hernando Hervás", telefono: "943299052", direccion: "Via Nazario Romero 183, Guadalajara, 32110", fecha_egreso: "2022-04-26", sexo: "M", nombre_carrera: "Ingeniería Ambiental", nombre_facultad: "Facultad de Ingeniería", grado_academico: "Bachiller", nombre_usuario: "carla.hernando44134", correo: "carla.hernando44134@gmail.com", estado_usuario: "Activo", fecha_creacion: "2023-11-13 00:52:01", ultimo_acceso: "2024-03-28 23:34:56" },
  { id_usuario: 8, dni: "40619597", nombre_egresado: "Casemiro Pepe", apellidos_egresado: "Arranz Arnaiz", telefono: "946757780", direccion: "Rambla de Sergio Múgica 28, Ceuta, 19443", fecha_egreso: "2026-03-01", sexo: "F", nombre_carrera: "Ingeniería de Sistemas", nombre_facultad: "Facultad de Ingeniería", grado_academico: "Bachiller", nombre_usuario: "casemiro.arranz71616", correo: "casemiro.arranz71616@hotmail.com", estado_usuario: "Activo", fecha_creacion: "2024-09-19 22:07:45", ultimo_acceso: "2026-04-18 23:03:15" },
];

// Muestra local de empresas para fallback de la UI.
const EMPRESAS = [
  { id_usuario: 25001, ruc: "20041779342", razon_social: "Finanzas Ugarte S.R.L.", nombre_comercial: "Finanzas Ugarte", sector: "Salud", direccion: "Via Tristán Morillo 978, Vizcaya, 23699", telefono: "982461452", pagina_web: "www.finanzasugartes14768.com", correo: "contacto@finanzasugarte.pe", estado_usuario: "Activo" },
  { id_usuario: 25002, ruc: "20480390412", razon_social: "Olivares & Asociados S.Coop. E.I.R.L.", nombre_comercial: "Olivares & Asociados S.Coop.", sector: "Finanzas", direccion: "Calle Dora Jáuregui 49, Huelva, 36889", telefono: "988947553", pagina_web: "www.olivares-asociados.com", correo: "info@olivaresasociados.pe", estado_usuario: "Activo" },
  { id_usuario: 25003, ruc: "20748005688", razon_social: "Manufacturas Heredia L. S.A.C.", nombre_comercial: "Manufacturas Heredia L.", sector: "Industrial", direccion: "Rambla Pepe Amor 5, Vizcaya, 21554", telefono: "916291288", pagina_web: "www.manufacturasheredia.com", correo: "rrhh@manufacturasheredia.pe", estado_usuario: "Activo" },
  { id_usuario: 25004, ruc: "20170018898", razon_social: "Roura y Rovira S.Coop. S.R.L.", nombre_comercial: "Roura y Rovira S.Coop.", sector: "Retail", direccion: "Urbanización Anastasio Vélez 16, Baleares, 13492", telefono: "972839301", pagina_web: "www.rourayrovira.com", correo: "info@rourayrovira.pe", estado_usuario: "Inactivo" },
  { id_usuario: 25005, ruc: "20894130606", razon_social: "Amorós & Asociados N.E E.I.R.L.", nombre_comercial: "Amorós & Asociados N.E", sector: "Retail", direccion: "Urbanización Ámbar Bolaños 749, Asturias, 25671", telefono: "945658566", pagina_web: "www.amorosasociados.com", correo: "info@amorosasociados.pe", estado_usuario: "Activo" },
  { id_usuario: 25006, ruc: "20108700481", razon_social: "Comercial VY S.A. E.I.R.L.", nombre_comercial: "Comercial VY S.A.", sector: "Educación", direccion: "Calle Eloy Acevedo 22, Castellón, 27277", telefono: "953895074", pagina_web: "www.comercialvy.com", correo: "contacto@comercialvy.pe", estado_usuario: "Activo" },
];

// tabla: oferta_laboral. estado_oferta: "Activa" | "Cerrada" (valores reales del INSERT)
const OFERTAS = [
  { id_oferta: 1, titulo: "Arquitecto BIM", descripcion: "Oportunidad laboral para profesionales con conocimientos en gestión y resolución de problemas.", puesto: "Arquitecto BIM", area: "Salud", ubicacion: "Piura", modalidad: "Híbrido", tipo_contrato: "Practicante", salario: 5142.54, requisitos: "Disponibilidad inmediata", fecha_publicacion: "2026-03-24", fecha_cierre: "2026-04-23", estado_oferta: "Activa", empresa: "Finanzas Ugarte S.R.L." },
  { id_oferta: 2, titulo: "QA Engineer", descripcion: "Puesto dirigido a profesionales proactivos con enfoque en innovación y mejora continua.", puesto: "QA Engineer", area: "Tecnología", ubicacion: "Huánuco", modalidad: "Híbrido", tipo_contrato: "Temporal", salario: 6603.46, requisitos: "Comunicación efectiva y orientación a resultados", fecha_publicacion: "2025-12-12", fecha_cierre: "2026-01-11", estado_oferta: "Activa", empresa: "Manufacturas Heredia L. S.A.C." },
  { id_oferta: 3, titulo: "Psicólogo Organizacional", descripcion: "Se busca egresado con habilidades técnicas y disposición para trabajo híbrido.", puesto: "Psicólogo Organizacional", area: "Salud", ubicacion: "Tacna", modalidad: "Híbrido", tipo_contrato: "Temporal", salario: 5450.86, requisitos: "Comunicación efectiva y orientación a resultados", fecha_publicacion: "2025-12-30", fecha_cierre: "2026-01-29", estado_oferta: "Cerrada", empresa: "Amorós & Asociados N.E E.I.R.L." },
  { id_oferta: 4, titulo: "Data Analyst", descripcion: "Se busca egresado con habilidades técnicas y disposición para trabajo presencial.", puesto: "Data Analyst", area: "Educación", ubicacion: "Piura", modalidad: "Presencial", tipo_contrato: "Indefinido", salario: 5941.11, requisitos: "Disponibilidad inmediata", fecha_publicacion: "2025-06-15", fecha_cierre: "2025-07-15", estado_oferta: "Cerrada", empresa: "Roura y Rovira S.Coop. S.R.L." },
  { id_oferta: 5, titulo: "Cybersecurity Analyst", descripcion: "Empresa peruana busca profesional con experiencia en trabajo colaborativo.", puesto: "Cybersecurity Analyst", area: "Finanzas", ubicacion: "Tacna", modalidad: "Híbrido", tipo_contrato: "Temporal", salario: 4252.46, requisitos: "Disponibilidad inmediata", fecha_publicacion: "2025-08-04", fecha_cierre: "2025-09-03", estado_oferta: "Activa", empresa: "Olivares & Asociados S.Coop. E.I.R.L." },
  { id_oferta: 7, titulo: "Software Architect", descripcion: "Se valorará experiencia previa, habilidades blandas y trabajo en equipo.", puesto: "Software Architect", area: "Tecnología", ubicacion: "Trujillo", modalidad: "Remoto", tipo_contrato: "Temporal", salario: 2863.28, requisitos: "Comunicación efectiva y orientación a resultados", fecha_publicacion: "2026-01-13", fecha_cierre: "2026-02-12", estado_oferta: "Activa", empresa: "Comercial VY S.A. E.I.R.L." },
];

// tabla: postulacion. estado_postulacion: "En Proceso" | "Aceptado" | "Pendiente" | "Rechazado"
const POSTULACIONES = [
  { id_postulacion: 1, egresado: "Bartolomé Pilar Vicente Abascal", carrera: "Auditoría", oferta: "Arquitecto BIM", empresa: "Finanzas Ugarte S.R.L.", fecha_postulacion: "2025-07-12 16:37:24", estado_postulacion: "En Proceso", observaciones: "Postulante con habilidades técnicas destacadas", cv_adjunto: "CV_Bartolomé_Vicente_Abascal.pdf" },
  { id_postulacion: 2, egresado: "Bartolomé Pilar Vicente Abascal", carrera: "Auditoría", oferta: "QA Engineer", empresa: "Manufacturas Heredia L. S.A.C.", fecha_postulacion: "2025-03-17 19:33:30", estado_postulacion: "Aceptado", observaciones: "Pendiente de validación de referencias", cv_adjunto: "CV_Bartolomé_Vicente_Abascal.pdf" },
  { id_postulacion: 3, egresado: "Florencia Lourdes Montesinos Borrego", carrera: "Economía Internacional", oferta: "Data Analyst", empresa: "Roura y Rovira S.Coop.", fecha_postulacion: "2024-09-25 14:53:12", estado_postulacion: "Rechazado", observaciones: "No cumple años mínimos de experiencia", cv_adjunto: "CV_Florencia_Montesinos_Borrego.pdf" },
  { id_postulacion: 4, egresado: "Florencia Lourdes Montesinos Borrego", carrera: "Economía Internacional", oferta: "Cybersecurity Analyst", empresa: "Olivares & Asociados S.Coop.", fecha_postulacion: "2026-01-30 08:21:09", estado_postulacion: "Pendiente", observaciones: "CV en evaluación", cv_adjunto: "CV_Florencia_Montesinos_Borrego.pdf" },
  { id_postulacion: 5, egresado: "Rosario Pascuala Barral Vergara", carrera: "Diseño de Interiores", oferta: "Software Architect", empresa: "Comercial VY S.A.", fecha_postulacion: "2024-07-03 11:18:34", estado_postulacion: "Aceptado", observaciones: "Pendiente de validación de referencias", cv_adjunto: "CV_Rosario_Barral_Vergara.pdf" },
];

// tabla: historial_laboral. IMPORTANTE: NO existe campo `descripcion` en esta tabla.
// Campo `actual` es BOOLEAN.
const HISTORIAL_LABORAL = [
  { id_historial: 17, nombre_empresa: "Minería HXJ S.Com.", cargo: "Cybersecurity Analyst", fecha_inicio: "2022-08-06", fecha_fin: "2027-07-07", salario: 5294.69, modalidad: "Híbrido", actual: true },
  { id_historial: 18, nombre_empresa: "Talleres Castellana S.A.D", cargo: "Cloud Engineer", fecha_inicio: "2023-11-15", fecha_fin: "2026-05-28", salario: 2212.71, modalidad: "Híbrido", actual: true },
  { id_historial: 1, nombre_empresa: "María Jesús Zamorano Fiol S.L.", cargo: "Software Architect", fecha_inicio: "2018-10-04", fecha_fin: "2023-04-02", salario: 2982.30, modalidad: "Remoto", actual: false },
];

// tabla: encuesta_seguimiento. Valores reales del INSERT.
// estado_laboral: Empleado | Independiente | Desempleado | Estudiando | Emprendedor
// satisfaccion_profesional: Muy Satisfecho | Satisfecho | Regular | Insatisfecho
// tiempo_conseguir_empleo: 1 mes | 3 meses | 6 meses | 1 año
// Muestra local de encuestas para fallback de la UI.
const ENCUESTAS = [
  { id_encuesta: 1, fecha_registro: "2026-04-11", estado_laboral: "Estudiando", nombre_empresa_actual: "Familia Iñiguez S.A.", cargo_actual: "Analista Financiero", area_trabajo: "Logística", sueldo_mensual: 3147.74, tipo_contrato: "Temporal", satisfaccion_profesional: "Muy Satisfecho", tiempo_conseguir_empleo: "3 meses", observaciones: "Cuenta con experiencia en proyectos", egresado: "Bartolomé Pilar Vicente Abascal", fecha_asociacion: "2026-05-10 17:04:11" },
  { id_encuesta: 2, fecha_registro: "2025-11-17", estado_laboral: "Estudiando", nombre_empresa_actual: "Manufacturas Talavera S.A.", cargo_actual: "Diseñador UX/UI", area_trabajo: "Salud", sueldo_mensual: 7995.19, tipo_contrato: "Indefinido", satisfaccion_profesional: "Insatisfecho", tiempo_conseguir_empleo: "1 año", observaciones: "Actualmente trabajando en su área profesional", egresado: "Florencia Lourdes Montesinos Borrego", fecha_asociacion: "2026-05-10 17:04:11" },
  { id_encuesta: 3, fecha_registro: "2025-11-16", estado_laboral: "Emprendedor", nombre_empresa_actual: "Comercial Cabrero S.Coop.", cargo_actual: "Diseñador UX/UI", area_trabajo: "Salud", sueldo_mensual: 5130.23, tipo_contrato: "Indefinido", satisfaccion_profesional: "Regular", tiempo_conseguir_empleo: "1 mes", observaciones: "Busca mejores oportunidades laborales", egresado: "Rosario Pascuala Barral Vergara", fecha_asociacion: "2026-05-10 17:04:11" },
  { id_encuesta: 7, fecha_registro: "2026-01-11", estado_laboral: "Desempleado", nombre_empresa_actual: null, cargo_actual: null, area_trabajo: "Educación", sueldo_mensual: null, tipo_contrato: null, satisfaccion_profesional: "Insatisfecho", tiempo_conseguir_empleo: "1 año", observaciones: "Desea especializarse académicamente", egresado: "Flavio Cornelio Álamo Pino", fecha_asociacion: "2026-05-10 17:04:11" },
  { id_encuesta: 9, fecha_registro: "2025-07-28", estado_laboral: "Empleado", nombre_empresa_actual: "Emilio Escrivá Asenjo S.L.N.E", cargo_actual: "Cloud Engineer", area_trabajo: "Retail", sueldo_mensual: 7155.12, tipo_contrato: "Indefinido", satisfaccion_profesional: "Muy Satisfecho", tiempo_conseguir_empleo: "3 meses", observaciones: "Desea especializarse académicamente", egresado: "Nadia Silvia Agullo Goicoechea", fecha_asociacion: "2026-05-10 17:04:11" },
];

// tabla: notificacion
const NOTIFICACIONES_DATA = [
  { id_notificacion: 1, id_usuario: 1, titulo: "Postulación aceptada", mensaje: "Tu postulación al puesto 'QA Engineer' en Manufacturas Heredia L. S.A.C. ha sido aceptada. El equipo de RRHH se pondrá en contacto contigo.", leido: false, fecha_envio: "2026-06-20 10:30:00" },
  { id_notificacion: 2, id_usuario: 1, titulo: "Nueva oferta disponible", mensaje: "Hay una nueva oferta laboral que coincide con tu perfil: 'Software Architect' en Trujillo, modalidad Remoto.", leido: true, fecha_envio: "2026-06-18 08:15:00" },
  { id_notificacion: 3, id_usuario: 1, titulo: "Recordatorio: Encuesta de seguimiento", mensaje: "Tu encuesta de seguimiento laboral estará disponible a partir del 15/07/2026. Por favor, complétala a tiempo.", leido: false, fecha_envio: "2026-06-15 14:00:00" },
  { id_notificacion: 4, id_usuario: 1, titulo: "CV en revisión", mensaje: "Tu CV para el puesto 'Arquitecto BIM' está siendo revisado por el equipo de selección de Finanzas Ugarte S.R.L.", leido: true, fecha_envio: "2026-06-10 09:45:00" },
];

// tabla: auditoria
const AUDITORIA_DATA = [
  { id_auditoria: 1, tabla_afectada: "egresado", accion: "INSERT", id_registro: 16, descripcion: "Nuevo egresado registrado: Adriana Gallardo Benítez (DNI: 48991922)", fecha_evento: "2026-03-04 16:17:47", usuario_bd: "admin.general001" },
  { id_auditoria: 2, tabla_afectada: "oferta_laboral", accion: "UPDATE", id_registro: 3, descripcion: "estado_oferta actualizado: Activa → Cerrada (id_oferta=3)", fecha_evento: "2026-01-30 09:00:00", usuario_bd: "admin.bolsa001" },
  { id_auditoria: 3, tabla_afectada: "postulacion", accion: "INSERT", id_registro: 28, descripcion: "Nueva postulación: id_egresado=10, id_oferta=2050", fecha_evento: "2026-05-09 03:19:12", usuario_bd: "admin.bolsa001" },
  { id_auditoria: 4, tabla_afectada: "encuesta_seguimiento", accion: "INSERT", id_registro: 11, descripcion: "Nueva encuesta registrada para id_egresado=11 (seguimiento_egresado)", fecha_evento: "2026-04-15 10:22:00", usuario_bd: "admin.encuesta001" },
  { id_auditoria: 5, tabla_afectada: "empresa", accion: "UPDATE", id_registro: 25004, descripcion: "Empresa actualizada: Roura y Rovira S.Coop. S.R.L. — sector y dirección", fecha_evento: "2026-02-15 11:30:00", usuario_bd: "admin.general001" },
  { id_auditoria: 6, tabla_afectada: "usuario", accion: "UPDATE", id_registro: 13, descripcion: "ultimo_acceso actualizado: joaquín.mosquera73200", fecha_evento: "2026-03-10 16:45:00", usuario_bd: "admin.general001" },
  { id_auditoria: 7, tabla_afectada: "historial_laboral", accion: "INSERT", id_registro: 22, descripcion: "Nuevo historial: id_egresado=9, cargo=QA Engineer, actual=TRUE", fecha_evento: "2026-01-05 08:00:00", usuario_bd: "admin.general001" },
];

// Chart data
const DATA_CARRERA = [
  { name: "Ing. de Sistemas", egresados: 142 },
  { name: "Administración", egresados: 118 },
  { name: "Contabilidad", egresados: 95 },
  { name: "Ing. Civil", egresados: 87 },
  { name: "Derecho Penal", egresados: 76 },
  { name: "Medicina Humana", egresados: 64 },
];
const DATA_FACULTAD = [
  { name: "Ingeniería", value: 229, color: "#2563EB" },
  { name: "Administración", value: 213, color: "#0EA5E9" },
  { name: "Derecho", value: 76, color: "#6366F1" },
  { name: "Salud / Enf.", value: 117, color: "#10B981" },
  { name: "Otras", value: 53, color: "#F59E0B" },
];
const DATA_LABORAL = [
  { name: "Empleado", value: 58, color: "#10B981" },
  { name: "Independiente", value: 22, color: "#2563EB" },
  { name: "Desempleado", value: 12, color: "#EF4444" },
  { name: "Estudiando", value: 8, color: "#F59E0B" },
];
const DATA_OFERTAS_HIST = [
  { mes: "Sep", activas: 12, cerradas: 5 },
  { mes: "Oct", activas: 18, cerradas: 8 },
  { mes: "Nov", activas: 15, cerradas: 12 },
  { mes: "Dic", activas: 22, cerradas: 10 },
  { mes: "Ene", activas: 28, cerradas: 15 },
];
const DATA_POST_EVOLUCION = [
  { mes: "Sep", postulaciones: 45 },
  { mes: "Oct", postulaciones: 78 },
  { mes: "Nov", postulaciones: 62 },
  { mes: "Dic", postulaciones: 95 },
  { mes: "Ene", postulaciones: 120 },
];

const ADMIN_DASHBOARD_FALLBACK: AdminDashboardData = {
  counts: {
    totalEgresados: 688,
    totalEmpresas: 46,
    totalOfertas: 124,
    ofertasActivas: 89,
    totalPostulaciones: 1247,
    totalEncuestas: 412,
  },
  charts: {
    egresadosPorCarrera: DATA_CARRERA,
    egresadosPorFacultad: DATA_FACULTAD,
    estadoLaboral: DATA_LABORAL,
    ofertasHistorial: DATA_OFERTAS_HIST,
    postulacionesEvolucion: DATA_POST_EVOLUCION,
  },
};
const EMPRESA_DASHBOARD_FALLBACK: EmpresaDashboardData = {
  profile: EMPRESAS[0],
  counts: {
    totalOfertas: 8,
    ofertasActivas: 5,
    ofertasCerradas: 3,
    totalPostulaciones: 47,
    postulacionesPendientes: 12,
    postulacionesAceptadas: 0,
    postulacionesRechazadas: 0,
    postulacionesEnProceso: 0,
  },
  ofertasActivas: OFERTAS.filter(o => o.estado_oferta === "Activa"),
  ultimasPostulaciones: POSTULACIONES,
};
const EGRESADO_PROFILE_FALLBACK = EGRESADOS[0] as EgresadoPerfil;
const EGRESADO_DASHBOARD_FALLBACK: EgresadoDashboardData = {
  profile: EGRESADO_PROFILE_FALLBACK,
  metrics: {
    totalPostulaciones: 3,
    estadoLaboralActual: "Estudiando",
    ultimaEmpresa: HISTORIAL_LABORAL[0]?.nombre_empresa ?? "Sin historial",
    ofertasActivas: OFERTAS.filter(o => o.estado_oferta === "Activa").length,
    historialRegistrado: true,
    encuestaCompletada: false,
  },
  ofertasRecomendadas: OFERTAS.filter(o => o.estado_oferta === "Activa").slice(0, 3),
};
const DEFAULT_PAGE_SIZE = 10;
const CRUD_PHASE_MESSAGE = "Acción no disponible para esta pantalla.";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

type ToastVariant = "success" | "error" | "warning" | "info";
type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
};
type FeedbackContextValue = {
  toast: (variant: ToastVariant, title: string, message?: string) => void;
  requestConfirmation: (options: ConfirmOptions) => Promise<boolean>;
};

let globalToastHandler: FeedbackContextValue["toast"] | null = null;

function notifySystem(variant: ToastVariant, title: string, message?: string) {
  globalToastHandler?.(variant, title, message);
}

function unavailableCrudAction() {
  notifySystem("info", CRUD_PHASE_MESSAGE);
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useFeedback debe usarse dentro de FeedbackProvider.");
  return context;
}

function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);

  const toast = useCallback<FeedbackContextValue["toast"]>((variant, title, message) => {
    const style = toastStyles[variant];
    sonnerToast.custom((id) => (
      <div style={{ display: "flex", gap: 12, padding: "14px 16px", background: style.background, border: `1px solid ${style.border}`, borderRadius: 10, boxShadow: "0 14px 36px rgba(15,23,42,0.16)", color: style.color, width: 360, maxWidth: "calc(100vw - 44px)" }}>
        <div style={{ flexShrink: 0, marginTop: 1 }}>{style.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: message ? 3 : 0 }}>{title}</div>
          {message && <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>{message}</div>}
        </div>
        <button type="button" onClick={() => sonnerToast.dismiss(id)} style={{ width: 24, height: 24, border: "none", background: "transparent", cursor: "pointer", color: style.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><X size={14} /></button>
      </div>
    ), { duration: 4200 });
  }, []);

  const requestConfirmation = useCallback<FeedbackContextValue["requestConfirmation"]>((options) => (
    new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    })
  ), []);

  useEffect(() => {
    globalToastHandler = toast;
    return () => {
      if (globalToastHandler === toast) globalToastHandler = null;
    };
  }, [toast]);

  const toastStyles: Record<ToastVariant, { border: string; background: string; color: string; icon: React.ReactNode }> = {
    success: { border: "#BBF7D0", background: "#F0FDF4", color: "#166534", icon: <CheckCircle size={18} /> },
    error: { border: "#FECACA", background: "#FEF2F2", color: "#991B1B", icon: <AlertCircle size={18} /> },
    warning: { border: "#FDE68A", background: "#FFFBEB", color: "#92400E", icon: <AlertCircle size={18} /> },
    info: { border: "#BFDBFE", background: "#EFF6FF", color: "#1E40AF", icon: <Info size={18} /> },
  };

  function closeConfirm(value: boolean) {
    confirmState?.resolve(value);
    setConfirmState(null);
  }

  return (
    <FeedbackContext.Provider value={{ toast, requestConfirmation }}>
      {children}
      <SonnerToaster position="top-right" expand visibleToasts={4} offset={{ top: 76, right: 22 }} />
      {confirmState && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 550, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 440, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", overflow: "hidden" }}>
            <div style={{ padding: "22px 24px 12px" }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>{confirmState.title}</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "#64748B" }}>{confirmState.message}</div>
            </div>
            <div style={{ padding: "16px 24px 22px", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => closeConfirm(false)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", color: "#374151", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>{confirmState.cancelLabel ?? "Cancelar"}</button>
              <button type="button" onClick={() => closeConfirm(true)} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: confirmState.variant === "danger" ? "#DC2626" : "#2563EB", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{confirmState.confirmLabel ?? "Confirmar"}</button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

function paginatedFallback<T>(items: T[], page = 1, pageSize = DEFAULT_PAGE_SIZE): PaginatedResponse<T> {
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
}

// ─── Utility Components ───────────────────────────────────────────────────────
type BadgeVariant = "success" | "danger" | "warning" | "info" | "neutral";

function Badge({ label, variant }: { label: string; variant: BadgeVariant }) {
  const styles: Record<BadgeVariant, React.CSSProperties> = {
    success: { background: "#DCFCE7", color: "#166534" },
    danger: { background: "#FEE2E2", color: "#991B1B" },
    warning: { background: "#FEF3C7", color: "#92400E" },
    info: { background: "#DBEAFE", color: "#1E40AF" },
    neutral: { background: "#F1F5F9", color: "#475569" },
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500, ...styles[variant] }}>
      {label}
    </span>
  );
}

// Valores reales de la BD mapeados a variante visual
const STATUS_MAP: Record<string, BadgeVariant> = {
  // estado_oferta (oferta_laboral)
  "Activa": "success", "Cerrada": "neutral",
  // estado_postulacion (postulacion)
  "En Proceso": "warning", "Pendiente": "info", "Aceptado": "success", "Rechazado": "danger",
  // estado_usuario (usuario)
  "Activo": "success", "Inactivo": "neutral",
  // estado_laboral (encuesta_seguimiento)
  "Empleado": "success", "Independiente": "info", "Desempleado": "danger",
  "Estudiando": "info", "Emprendedor": "warning",
  // auditoria.accion
  "INSERT": "success", "UPDATE": "warning", "DELETE": "danger",
};

function StatusBadge({ label }: { label: string }) {
  return <Badge label={label} variant={STATUS_MAP[label] ?? "neutral"} />;
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #E2E8F0", display: "flex", alignItems: "flex-start", gap: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", color: color, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 13, color: "#64748B", fontWeight: 500, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#0F172A", lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 5 }}>{sub}</div>}
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 13, color: "#64748B", margin: "5px 0 0" }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden", ...style }}>{children}</div>;
}

function Btn({ children, variant = "primary", onClick, small, disabled }: { children: React.ReactNode; variant?: "primary" | "ghost" | "danger" | "outline" | "success"; onClick?: () => void; small?: boolean; disabled?: boolean }) {
  const base: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 500, border: "none", cursor: disabled ? "not-allowed" : "pointer", borderRadius: 8, padding: small ? "5px 11px" : "9px 18px", fontSize: small ? 13 : 14, fontFamily: "inherit", opacity: disabled ? 0.5 : 1 };
  const variants: Record<string, React.CSSProperties> = { primary: { background: "#2563EB", color: "#fff" }, ghost: { background: "transparent", color: "#64748B" }, danger: { background: "#FEE2E2", color: "#991B1B", border: "none" }, outline: { background: "#fff", color: "#374151", border: "1px solid #D1D5DB" }, success: { background: "#DCFCE7", color: "#166534", border: "none" } };
  return <button type="button" style={{ ...base, ...variants[variant] }} onClick={disabled ? undefined : onClick} disabled={disabled}>{children}</button>;
}

function TH({ label }: { label: string }) {
  return <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", background: "#F8FAFC", whiteSpace: "nowrap" }}>{label}</th>;
}

function TD({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <td style={{ padding: "12px 16px", fontSize: 13, color: "#0F172A", borderTop: "1px solid #F1F5F9", fontFamily: mono ? "monospace" : "inherit" }}>{children}</td>;
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
      <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
      <input style={{ width: "100%", padding: "8px 12px 8px 36px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function EmptyState({ message = "No se encontraron resultados." }: { message?: string }) {
  return (
    <tr>
      <td colSpan={12} style={{ padding: "22px 16px", textAlign: "center", fontSize: 13, color: "#64748B" }}>{message}</td>
    </tr>
  );
}

function humanizeTechnicalText(value: string | number | null | undefined) {
  if (value == null) return "—";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\bid usuario\b/gi, "usuario")
    .replace(/\bid egresado\b/gi, "egresado")
    .replace(/\bid oferta\b/gi, "oferta")
    .replace(/\bid postulacion\b/gi, "postulación")
    .replace(/\bid encuesta\b/gi, "encuesta")
    .replace(/\bestado oferta\b/gi, "estado de oferta")
    .replace(/\bestado postulacion\b/gi, "estado de postulación")
    .replace(/\bultimo acceso\b/gi, "último acceso")
    .replace(/\bTRUE\b/g, "Sí")
    .replace(/\bFALSE\b/g, "No");
}

function humanizeAction(value: string | null | undefined) {
  const actions: Record<string, string> = {
    INSERT: "Crear",
    UPDATE: "Actualizar",
    DELETE: "Eliminar",
  };
  return value ? actions[value] ?? value : "—";
}

function humanizeAuditUser(value: string | null | undefined) {
  if (!value) return "Sistema";
  return value.includes("@") || value.includes("_") ? "Sistema" : value;
}

function isEmptySeries(data: Record<string, unknown>[], keys: string[]) {
  return data.length === 0 || data.every((item) => keys.every((key) => Number(item[key] ?? 0) === 0));
}

function ChartEmptyState() {
  return (
    <div style={{ height: "100%", minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#64748B", fontSize: 13 }}>
      No hay información disponible para los filtros seleccionados.
    </div>
  );
}

function Pagination({ total, showing, page = 1, pageSize = DEFAULT_PAGE_SIZE, onPageChange }: { total: number; showing: number; page?: number; pageSize?: number; onPageChange?: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pages = Array.from(new Set([1, Math.max(1, page - 1), page, Math.min(totalPages, page + 1), totalPages])).filter(p => p >= 1 && p <= totalPages);
  return (
    <div style={{ padding: "12px 20px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13, color: "#64748B" }}>Mostrando {showing} de {total} registros</span>
      <div style={{ display: "flex", gap: 4 }}>
        {pages.map((p) => <button key={p} onClick={() => onPageChange?.(p)} style={{ padding: "4px 10px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 13, cursor: "pointer", background: p === page ? "#2563EB" : "#fff", color: p === page ? "#fff" : "#374151", fontFamily: "inherit" }}>{p}</button>)}
        <button onClick={() => onPageChange?.(Math.min(totalPages, page + 1))} style={{ padding: "4px 10px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 13, cursor: "pointer", background: "#fff", color: "#374151", fontFamily: "inherit" }}>→</button>
      </div>
    </div>
  );
}

function FormField({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{label} {required && <span style={{ color: "#EF4444" }}>*</span>}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

const INP: React.CSSProperties = { width: "100%", padding: "10px 14px", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 13, color: "#0F172A", background: "#fff", outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

function toDateInputValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function readOfertaForm(formElement: HTMLFormElement): Partial<AdminOferta> | null {
  const form = new FormData(formElement);
  const salarioRaw = String(form.get("salario") ?? "").trim();
  const salario = salarioRaw ? Number(salarioRaw) : null;

  if (salario !== null && (!Number.isFinite(salario) || salario <= 0)) {
    notifySystem("warning", "Validación de oferta", "El salario debe ser mayor a 0 si se informa.");
    return null;
  }

  const payload: Partial<AdminOferta> = {
    titulo: String(form.get("titulo") ?? "").trim(),
    descripcion: String(form.get("descripcion") ?? "").trim(),
    puesto: String(form.get("puesto") ?? "").trim(),
    area: String(form.get("area") ?? "").trim(),
    ubicacion: String(form.get("ubicacion") ?? "").trim(),
    modalidad: String(form.get("modalidad") ?? "").trim(),
    tipo_contrato: String(form.get("tipo_contrato") ?? "").trim(),
    salario,
    requisitos: String(form.get("requisitos") ?? "").trim(),
    fecha_cierre: String(form.get("fecha_cierre") ?? "").trim(),
    estado_oferta: String(form.get("estado_oferta") ?? "").trim(),
  };

  if (form.has("id_empresa")) {
    payload.id_empresa = Number(form.get("id_empresa"));
  }

  return payload;
}

function readAdminEgresadoForm(formElement: HTMLFormElement): Record<string, unknown> {
  const form = new FormData(formElement);
  return {
    nombre_usuario: String(form.get("nombre_usuario") ?? "").trim(),
    password: String(form.get("password") ?? "").trim(),
    correo: String(form.get("correo") ?? "").trim(),
    estado_usuario: String(form.get("estado_usuario") ?? "").trim(),
    dni: String(form.get("dni") ?? "").trim(),
    nombre_egresado: String(form.get("nombre_egresado") ?? "").trim(),
    apellidos_egresado: String(form.get("apellidos_egresado") ?? "").trim(),
    telefono: String(form.get("telefono") ?? "").trim(),
    direccion: String(form.get("direccion") ?? "").trim(),
    fecha_egreso: String(form.get("fecha_egreso") ?? "").trim(),
    sexo: String(form.get("sexo") ?? "").trim(),
    id_carrera: Number(form.get("id_carrera")),
  };
}

function readAdminEmpresaForm(formElement: HTMLFormElement): Record<string, unknown> {
  const form = new FormData(formElement);
  return {
    nombre_usuario: String(form.get("nombre_usuario") ?? "").trim(),
    password: String(form.get("password") ?? "").trim(),
    correo: String(form.get("correo") ?? "").trim(),
    estado_usuario: String(form.get("estado_usuario") ?? "").trim(),
    ruc: String(form.get("ruc") ?? "").trim(),
    razon_social: String(form.get("razon_social") ?? "").trim(),
    nombre_comercial: String(form.get("nombre_comercial") ?? "").trim(),
    sector: String(form.get("sector") ?? "").trim(),
    direccion: String(form.get("direccion") ?? "").trim(),
    telefono: String(form.get("telefono") ?? "").trim(),
    pagina_web: String(form.get("pagina_web") ?? "").trim(),
  };
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 700, maxHeight: "88vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 28px", borderBottom: "1px solid #F1F5F9", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0F172A", margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #E2E8F0", background: "#F8FAFC", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} color="#64748B" /></button>
        </div>
        <div style={{ padding: 28 }}>{children}</div>
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #F1F5F9" }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>{children}</div>
    </div>
  );
}

function DR({ label, value, full }: { label: string; value: string | number | null | undefined; full?: boolean }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: value != null && value !== "" ? "#0F172A" : "#CBD5E1", fontWeight: 500 }}>{value != null && value !== "" ? String(value) : "—"}</div>
    </div>
  );
}

function useApiData<T>(enabled: boolean, loader: () => Promise<T>, fallback: T): T {
  const [data, setData] = useState<T>(fallback);

  useEffect(() => {
    let active = true;

    if (!enabled) {
      setData(fallback);
      return () => {
        active = false;
      };
    }

    loader()
      .then((nextData) => {
        if (active) setData(nextData);
      })
      .catch(() => {
        if (active) setData(fallback);
      });

    return () => {
      active = false;
    };
  }, [enabled, loader, fallback]);

  return data;
}

function usePaginatedApiData<T>(
  enabled: boolean,
  loader: () => Promise<PaginatedResponse<T>>,
  fallback: PaginatedResponse<T>,
  deps: React.DependencyList
): PaginatedResponse<T> {
  const [data, setData] = useState<PaginatedResponse<T>>(fallback);

  useEffect(() => {
    let active = true;

    if (!enabled) {
      setData(fallback);
      return () => {
        active = false;
      };
    }

    loader()
      .then((nextData) => {
        if (active) setData(nextData);
      })
      .catch(() => {
        if (active) setData(fallback);
      });

    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return data;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const [view, setView] = useState<"login" | "recuperar">("login");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [correo, setCorreo] = useState("");
  const [recoveryNotice, setRecoveryNotice] = useState("");
  const [loginError, setLoginError] = useState("");

  const inp: React.CSSProperties = { width: "100%", padding: "11px 14px 11px 42px", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14, color: "#0F172A", background: "#F9FAFB", outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  const DEMOS: { role: Role; label: string; desc: string; icon: React.ReactNode }[] = [
    { role: "admin", label: "Administrador", desc: "admin.general001 — Gestión total", icon: <Settings size={15} /> },
    { role: "empresa", label: "Empresa", desc: "Finanzas Ugarte S.R.L. — Publicar ofertas", icon: <Building2 size={15} /> },
    { role: "egresado", label: "Egresado", desc: "florencia.montesinos46177 — Bolsa laboral", icon: <GraduationCap size={15} /> },
  ];

  async function handleSubmit() {
    const result = await authenticateUser(usuario, password);

    if (result.ok) {
      setLoginError("");
      onLogin(result.session);
      return;
    }

    const messages: Record<typeof result.reason, string> = {
      empty: "Ingresa nombre de usuario y contraseña.",
      invalid: "Credenciales inválidas.",
      inactive: "El usuario se encuentra inactivo.",
      "role-not-found": "El usuario no tiene un rol asignado.",
      network: "No se pudo conectar con el servidor de autenticación.",
    };

    setLoginError(messages[result.reason]);
  }

  async function handleDemoLogin(role: Role) {
    const credentials = getDemoCredentials(role);
    setUsuario(credentials.nombre_usuario);
    setPassword(credentials.password);

    const session = await getDemoSession(role);

    if (session) {
      setLoginError("");
      onLogin(session);
      return;
    }

    setLoginError("No se encontró una sesión demo válida.");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "Inter, sans-serif" }}>
      <div style={{ width: 460, background: "linear-gradient(160deg, #0A2647 0%, #144272 55%, #205295 100%)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 40px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}><GraduationCap size={26} color="#fff" /></div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 17, lineHeight: 1.2 }}>Universidad de Huánuco</div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>UDH — Oficina de Egresados</div>
          </div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", lineHeight: 1.3, marginBottom: 14 }}>Sistema de Seguimiento<br />de Egresados y<br />Bolsa Laboral</div>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.75, marginBottom: 40 }}>Plataforma integral para el seguimiento laboral, gestión de empresas y publicación de oportunidades de empleo.</p>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Acceso de Demostración por Rol</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {DEMOS.map(({ role, label, desc, icon }) => (
            <button key={role} onClick={() => handleDemoLogin(role)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", color: "#fff", textAlign: "left" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
              <div><div style={{ fontWeight: 600, fontSize: 13 }}>Entrar como {label}</div><div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{desc}</div></div>
            </button>
          ))}
        </div>
        <p style={{ marginTop: 12, fontSize: 11, color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>Estas opciones son únicamente para fines de demostración del sistema.</p>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC", padding: 48 }}>
        {view === "login" ? (
          <div style={{ width: "100%", maxWidth: 400 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Iniciar Sesión</h1>
            <p style={{ color: "#64748B", fontSize: 14, marginBottom: 32 }}>Ingresa tu usuario y contraseña.</p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Usuario</label>
              <div style={{ position: "relative" }}><User size={16} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} /><input style={inp} placeholder="Usuario" value={usuario} onChange={e => { setUsuario(e.target.value); setLoginError(""); }} onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }} /></div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Contraseña</label>
              <div style={{ position: "relative" }}><Lock size={16} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} /><input style={inp} type="password" placeholder="••••••••" value={password} onChange={e => { setPassword(e.target.value); setLoginError(""); }} onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }} /></div>
            </div>
            {loginError && <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 8, background: "#FEE2E2", color: "#991B1B", fontSize: 12, fontWeight: 500 }}>{loginError}</div>}
            <div style={{ textAlign: "right", marginBottom: 28 }}>
              <button onClick={() => setView("recuperar")} style={{ fontSize: 13, color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>¿Olvidaste tu contraseña?</button>
            </div>
            <button onClick={handleSubmit} style={{ width: "100%", padding: "13px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Iniciar Sesión</button>
          </div>
        ) : (
          /* Recuperación de contraseña */
          <div style={{ width: "100%", maxWidth: 420 }}>
            <button onClick={() => { setView("login"); setRecoveryNotice(""); setCorreo(""); }} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748B", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", marginBottom: 24 }}>← Volver al inicio de sesión</button>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}><RefreshCw size={22} color="#2563EB" /></div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Recuperar Contraseña</h1>
            <p style={{ color: "#64748B", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>Ingresa tu correo institucional registrado para solicitar asistencia con el acceso.</p>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Correo institucional</label>
              <div style={{ position: "relative" }}><User size={16} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} /><input style={{ ...inp, paddingLeft: 42 }} type="email" placeholder="correo@udh.edu.pe" value={correo} onChange={e => { setCorreo(e.target.value); setRecoveryNotice(""); }} /></div>
            </div>
            <button onClick={() => setRecoveryNotice(correo.trim() ? "La recuperación automática de contraseña aún no está habilitada. Contacta al administrador del sistema para restablecer tu acceso." : "Ingresa tu correo institucional para solicitar asistencia.")} style={{ width: "100%", padding: "13px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Solicitar asistencia</button>
            {recoveryNotice && (
              <div style={{ marginTop: 16, padding: "14px 16px", background: "#EFF6FF", borderRadius: 10, border: "1px solid #BFDBFE", fontSize: 12, color: "#1E40AF", lineHeight: 1.6 }}>
                {recoveryNotice}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ADMIN: Dashboard ─────────────────────────────────────────────────────────
function AdminDashboard({ setScreen }: { setScreen: (s: Screen) => void }) {
  const loadDashboard = useCallback(() => adminApi.dashboard(), []);
  const dashboard = useApiData(true, loadDashboard, ADMIN_DASHBOARD_FALLBACK);
  const responseRate = dashboard.counts.totalEgresados > 0
    ? Math.round((dashboard.counts.totalEncuestas / dashboard.counts.totalEgresados) * 100)
    : 0;
  const quickLinks: { label: string; screen: Screen; icon: React.ReactNode; color: string }[] = [
    { label: "Gestión de Egresados", screen: "admin-egresados", icon: <GraduationCap size={20} />, color: "#2563EB" },
    { label: "Gestión de Empresas", screen: "admin-empresas", icon: <Building2 size={20} />, color: "#0EA5E9" },
    { label: "Gestión de Ofertas", screen: "admin-ofertas", icon: <Briefcase size={20} />, color: "#6366F1" },
    { label: "Gestión de Encuestas", screen: "admin-encuestas", icon: <ClipboardList size={20} />, color: "#10B981" },
    { label: "Reportes", screen: "admin-reportes", icon: <BarChart2 size={20} />, color: "#F59E0B" },
  ];
  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Resumen general — Universidad de Huánuco (UDH)" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard icon={<GraduationCap size={21} />} label="Total Egresados" value={dashboard.counts.totalEgresados.toLocaleString()} sub="Registrados en el sistema" color="#2563EB" />
        <StatCard icon={<Building2 size={21} />} label="Total Empresas" value={dashboard.counts.totalEmpresas.toLocaleString()} sub="Empresas registradas" color="#0EA5E9" />
        <StatCard icon={<Briefcase size={21} />} label="Ofertas Laborales" value={dashboard.counts.totalOfertas.toLocaleString()} sub={`${dashboard.counts.ofertasActivas.toLocaleString()} activas`} color="#6366F1" />
        <StatCard icon={<FileText size={21} />} label="Postulaciones" value={dashboard.counts.totalPostulaciones.toLocaleString()} sub="Solicitudes registradas" color="#10B981" />
        <StatCard icon={<ClipboardList size={21} />} label="Encuestas" value={dashboard.counts.totalEncuestas.toLocaleString()} sub={`${responseRate}% tasa de respuesta`} color="#F59E0B" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 18 }}>Egresados por Carrera</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={dashboard.charts.egresadosPorCarrera} layout="vertical" margin={{ left: 4, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} width={100} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} />
              <Bar dataKey="egresados" name="Egresados" fill="#2563EB" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 18 }}>Egresados por Facultad</div>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={dashboard.charts.egresadosPorFacultad} cx="50%" cy="50%" innerRadius={52} outerRadius={82} dataKey="value" paddingAngle={3}>
                {dashboard.charts.egresadosPorFacultad.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} />
              <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 24 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 18 }}>Estado Laboral (%)</div>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={dashboard.charts.estadoLaboral} cx="50%" cy="50%" outerRadius={82} dataKey="value" paddingAngle={3}>
                {dashboard.charts.estadoLaboral.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} />
              <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 18 }}>Ofertas Activas vs Cerradas</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={dashboard.charts.ofertasHistorial}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94A3B8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} />
              <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="activas" name="Activa" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cerradas" name="Cerrada" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <Card style={{ padding: 24 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 16 }}>Acceso Rápido</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {quickLinks.map((ql) => (
            <button key={ql.screen} onClick={() => setScreen(ql.screen)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#F8FAFC", cursor: "pointer", fontFamily: "inherit", flex: "1 1 auto" }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: ql.color + "18", display: "flex", alignItems: "center", justifyContent: "center", color: ql.color, flexShrink: 0 }}>{ql.icon}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{ql.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── ADMIN: Egresados ─────────────────────────────────────────────────────────
function AdminEgresados() {
  const { toast, requestConfirmation } = useFeedback();
  const [search, setSearch] = useState("");
  const [carreraFiltro, setCarreraFiltro] = useState("Todas");
  const [estadoFiltro, setEstadoFiltro] = useState("Todos");
  const [selected, setSelected] = useState<AdminEgresado | null>(null);
  const [editing, setEditing] = useState<AdminEgresado | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const carreras = useApiData<CarreraItem[]>(true, () => egresadoApi.carreras(), []);
  const fallback = paginatedFallback(EGRESADOS as AdminEgresado[], page);
  const egresadosPage = usePaginatedApiData(
    true,
    () => adminApi.egresados({ page, pageSize: DEFAULT_PAGE_SIZE, search, carrera: carreraFiltro, estado: estadoFiltro }),
    fallback,
    [page, search, carreraFiltro, estadoFiltro, refreshKey]
  );
  const egresados = egresadosPage.items;

  useEffect(() => {
    setPage(1);
  }, [search, carreraFiltro, estadoFiltro]);

  const filtered = egresados;
  const carrerasFiltro = [...new Set(carreras.map(c => c.nombre_carrera).concat((EGRESADOS as AdminEgresado[]).concat(egresados).map(e => e.nombre_carrera)))];
  const formItem = editing;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = readAdminEgresadoForm(event.currentTarget);
    setSaving(true);
    try {
      if (formItem) {
        await adminApi.actualizarEgresado(formItem.id_usuario, payload);
        toast("success", "Egresado actualizado correctamente.");
      } else {
        await adminApi.crearEgresado(payload);
        toast("success", "Egresado creado correctamente.");
      }
      setEditing(null);
      setCreating(false);
      setSelected(null);
      setRefreshKey(k => k + 1);
    } catch (error) {
      toast("error", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleEstado(item: AdminEgresado) {
    const nextEstado = item.estado_usuario === "Inactivo" ? "Activo" : "Inactivo";
    const confirmed = await requestConfirmation({
      title: nextEstado === "Activo" ? "Reactivar cuenta" : "Desactivar cuenta",
      message: `¿Deseas ${nextEstado === "Activo" ? "reactivar" : "desactivar"} la cuenta de ${item.nombre_egresado} ${item.apellidos_egresado}?`,
      confirmLabel: nextEstado === "Activo" ? "Reactivar" : "Desactivar",
      variant: nextEstado === "Activo" ? "primary" : "danger",
    });
    if (!confirmed) return;

    try {
      await adminApi.cambiarEstadoEgresado(item.id_usuario, nextEstado);
      toast("success", nextEstado === "Activo" ? "Cuenta reactivada correctamente." : "Cuenta desactivada correctamente.");
      setSelected(null);
      setRefreshKey(k => k + 1);
    } catch (error) {
      toast("error", getErrorMessage(error));
    }
  }

  return (
    <div>
      {(creating || editing) && (
        <DetailModal title={formItem ? `Editar Egresado: ${formItem.nombre_egresado}` : "Nuevo Egresado"} onClose={() => { setCreating(false); setEditing(null); }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <FormField label="Usuario" required><input name="nombre_usuario" style={INP} defaultValue={formItem?.nombre_usuario ?? ""} required /></FormField>
              <FormField label={formItem ? "Contraseña (opcional)" : "Contraseña"} required={!formItem}><input name="password" style={INP} type="password" required={!formItem} /></FormField>
              <FormField label="Correo" required><input name="correo" type="email" style={INP} defaultValue={formItem?.correo ?? ""} required /></FormField>
              <FormField label="Estado" required><select name="estado_usuario" style={INP} defaultValue={formItem?.estado_usuario ?? "Activo"}><option>Activo</option><option>Inactivo</option></select></FormField>
              <FormField label="DNI" required hint="8 dígitos."><input name="dni" style={INP} defaultValue={formItem?.dni ?? ""} maxLength={8} required /></FormField>
              <FormField label="Sexo" required><select name="sexo" style={INP} defaultValue={formItem?.sexo ?? "M"}><option value="M">Masculino (M)</option><option value="F">Femenino (F)</option></select></FormField>
              <FormField label="Nombres" required><input name="nombre_egresado" style={INP} defaultValue={formItem?.nombre_egresado ?? ""} required /></FormField>
              <FormField label="Apellidos" required><input name="apellidos_egresado" style={INP} defaultValue={formItem?.apellidos_egresado ?? ""} required /></FormField>
              <FormField label="Teléfono"><input name="telefono" style={INP} defaultValue={formItem?.telefono ?? ""} /></FormField>
              <FormField label="Fecha de egreso" required><input name="fecha_egreso" type="date" style={INP} defaultValue={toDateInputValue(formItem?.fecha_egreso)} required /></FormField>
              <div style={{ gridColumn: "1 / -1" }}>
                <FormField label="Carrera" required>
                  <select name="id_carrera" style={INP} defaultValue={formItem?.id_carrera ?? ""} required>
                    <option value="">Seleccionar...</option>
                    {carreras.map(c => <option key={c.id_carrera} value={c.id_carrera}>{c.nombre_carrera} - {c.nombre_facultad}</option>)}
                  </select>
                </FormField>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <FormField label="Dirección"><input name="direccion" style={INP} defaultValue={formItem?.direccion ?? ""} /></FormField>
              </div>
            </div>
            <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
              <button type="submit" disabled={saving} style={{ padding: "11px 26px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.65 : 1 }}>{saving ? "Guardando..." : "Guardar"}</button>
              <Btn variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Cancelar</Btn>
            </div>
          </form>
        </DetailModal>
      )}
      {selected && (
        <DetailModal title={`Detalle Egresado: ${selected.nombre_egresado} ${selected.apellidos_egresado}`} onClose={() => setSelected(null)}>
          <DetailSection title="Datos de acceso">
            <DR label="Usuario" value={selected.nombre_usuario} />
            <DR label="Correo" value={selected.correo} full />
            <DR label="Estado" value={selected.estado_usuario} />
            <DR label="Fecha de creación" value={selected.fecha_creacion} />
            <DR label="Último acceso" value={selected.ultimo_acceso} />
          </DetailSection>
          <DetailSection title="Datos personales">
            <DR label="DNI" value={selected.dni} />
            <DR label="Sexo" value={selected.sexo === "M" ? "Masculino" : "Femenino"} />
            <DR label="Nombres" value={selected.nombre_egresado} />
            <DR label="Apellidos" value={selected.apellidos_egresado} />
            <DR label="Teléfono" value={selected.telefono} />
            <DR label="Fecha de egreso" value={selected.fecha_egreso} />
            <DR label="Dirección" value={selected.direccion} full />
          </DetailSection>
          <DetailSection title="Datos académicos">
            <DR label="Carrera" value={selected.nombre_carrera} />
            <DR label="Grado académico" value={selected.grado_academico} />
            <DR label="Facultad" value={selected.nombre_facultad} />
          </DetailSection>
        </DetailModal>
      )}
      <PageHeader title="Gestión de Egresados" subtitle={`${egresadosPage.total} egresados registrados`} action={<Btn onClick={() => setCreating(true)}><Plus size={14} /> Nuevo Egresado</Btn>} />
      <Card>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", gap: 10, alignItems: "center" }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por DNI, nombre, carrera o correo..." />
          <select value={carreraFiltro} onChange={e => setCarreraFiltro(e.target.value)} style={{ padding: "7px 11px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit" }}>
            <option>Todas</option>
            {carrerasFiltro.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} style={{ padding: "7px 11px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit" }}>
            <option>Todos</option>
            <option>Activo</option>
            <option>Inactivo</option>
          </select>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH label="DNI" /><TH label="Nombres" /><TH label="Apellidos" /><TH label="Carrera" /><TH label="Facultad" /><TH label="Teléfono" /><TH label="Fecha de egreso" /><TH label="Sexo" /><TH label="Estado" /><TH label="Acciones" /></tr></thead>
            <tbody>
              {filtered.length === 0 && <EmptyState />}
              {filtered.map((e, i) => (
                <tr key={i}>
                  <TD mono>{e.dni}</TD>
                  <TD>{e.nombre_egresado}</TD>
                  <TD><span style={{ fontWeight: 600 }}>{e.apellidos_egresado}</span></TD>
                  <TD>{e.nombre_carrera}</TD>
                  <TD>{e.nombre_facultad}</TD>
                  <TD>{e.telefono}</TD>
                  <TD>{e.fecha_egreso}</TD>
                  <TD><Badge label={e.sexo === "M" ? "Masculino" : "Femenino"} variant={e.sexo === "M" ? "info" : "warning"} /></TD>
                  <TD><StatusBadge label={e.estado_usuario} /></TD>
                  <TD>
                    <div style={{ display: "flex", gap: 2 }}>
                      <Btn variant="outline" small onClick={() => setSelected(e)}><Eye size={14} /></Btn>
                      <Btn variant="ghost" small onClick={() => setEditing(e)}><Edit2 size={14} /></Btn>
                      <Btn variant="outline" small onClick={() => handleToggleEstado(e)}>{e.estado_usuario === "Inactivo" ? "Reactivar" : "Desactivar"}</Btn>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={egresadosPage.total} showing={filtered.length} page={egresadosPage.page} pageSize={egresadosPage.pageSize} onPageChange={setPage} />
      </Card>
    </div>
  );
}

// ─── ADMIN: Empresas ──────────────────────────────────────────────────────────
function AdminEmpresas() {
  const { toast, requestConfirmation } = useFeedback();
  const [search, setSearch] = useState("");
  const [sectorFiltro, setSectorFiltro] = useState("Todos");
  const [estadoFiltro, setEstadoFiltro] = useState("Todos");
  const [selected, setSelected] = useState<AdminEmpresa | null>(null);
  const [editing, setEditing] = useState<AdminEmpresa | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const fallback = paginatedFallback(EMPRESAS as AdminEmpresa[], page);
  const empresasPage = usePaginatedApiData(
    true,
    () => adminApi.empresas({ page, pageSize: DEFAULT_PAGE_SIZE, search, sector: sectorFiltro, estado: estadoFiltro }),
    fallback,
    [page, search, sectorFiltro, estadoFiltro, refreshKey]
  );
  const filtered = empresasPage.items;
  const sectores = [...new Set((EMPRESAS as AdminEmpresa[]).concat(filtered).map(e => e.sector))];

  useEffect(() => {
    setPage(1);
  }, [search, sectorFiltro, estadoFiltro]);
  const formItem = editing;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = readAdminEmpresaForm(event.currentTarget);
    setSaving(true);
    try {
      if (formItem) {
        await adminApi.actualizarEmpresa(formItem.id_usuario, payload);
        toast("success", "Empresa actualizada correctamente.");
      } else {
        await adminApi.crearEmpresa(payload);
        toast("success", "Empresa creada correctamente.");
      }
      setEditing(null);
      setCreating(false);
      setSelected(null);
      setRefreshKey(k => k + 1);
    } catch (error) {
      toast("error", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleEstado(item: AdminEmpresa) {
    const nextEstado = item.estado_usuario === "Inactivo" ? "Activo" : "Inactivo";
    const confirmed = await requestConfirmation({
      title: nextEstado === "Activo" ? "Reactivar cuenta" : "Desactivar cuenta",
      message: `¿Deseas ${nextEstado === "Activo" ? "reactivar" : "desactivar"} la cuenta de "${item.razon_social}"?`,
      confirmLabel: nextEstado === "Activo" ? "Reactivar" : "Desactivar",
      variant: nextEstado === "Activo" ? "primary" : "danger",
    });
    if (!confirmed) return;

    try {
      await adminApi.cambiarEstadoEmpresa(item.id_usuario, nextEstado);
      toast("success", nextEstado === "Activo" ? "Cuenta reactivada correctamente." : "Cuenta desactivada correctamente.");
      setSelected(null);
      setRefreshKey(k => k + 1);
    } catch (error) {
      toast("error", getErrorMessage(error));
    }
  }

  return (
    <div>
      {(creating || editing) && (
        <DetailModal title={formItem ? `Editar Empresa: ${formItem.razon_social}` : "Nueva Empresa"} onClose={() => { setCreating(false); setEditing(null); }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <FormField label="Usuario" required><input name="nombre_usuario" style={INP} defaultValue={formItem?.nombre_usuario ?? ""} required /></FormField>
              <FormField label={formItem ? "Contraseña (opcional)" : "Contraseña"} required={!formItem}><input name="password" style={INP} type="password" required={!formItem} /></FormField>
              <FormField label="Correo" required><input name="correo" type="email" style={INP} defaultValue={formItem?.correo ?? ""} required /></FormField>
              <FormField label="Estado" required><select name="estado_usuario" style={INP} defaultValue={formItem?.estado_usuario ?? "Activo"}><option>Activo</option><option>Inactivo</option></select></FormField>
              <FormField label="RUC" required hint="11 dígitos."><input name="ruc" style={INP} defaultValue={formItem?.ruc ?? ""} maxLength={11} required /></FormField>
              <FormField label="Razón social" required><input name="razon_social" style={INP} defaultValue={formItem?.razon_social ?? ""} required /></FormField>
              <FormField label="Nombre comercial"><input name="nombre_comercial" style={INP} defaultValue={formItem?.nombre_comercial ?? ""} /></FormField>
              <FormField label="Sector" required><input name="sector" style={INP} defaultValue={formItem?.sector ?? ""} required /></FormField>
              <FormField label="Teléfono"><input name="telefono" style={INP} defaultValue={formItem?.telefono ?? ""} /></FormField>
              <FormField label="Página web"><input name="pagina_web" style={INP} defaultValue={formItem?.pagina_web ?? ""} placeholder="www.ejemplo.com" /></FormField>
              <div style={{ gridColumn: "1 / -1" }}>
                <FormField label="Dirección" required><input name="direccion" style={INP} defaultValue={formItem?.direccion ?? ""} required /></FormField>
              </div>
            </div>
            <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
              <button type="submit" disabled={saving} style={{ padding: "11px 26px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.65 : 1 }}>{saving ? "Guardando..." : "Guardar"}</button>
              <Btn variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Cancelar</Btn>
            </div>
          </form>
        </DetailModal>
      )}
      {selected && (
        <DetailModal title={`Detalle Empresa: ${selected.razon_social}`} onClose={() => setSelected(null)}>
          <DetailSection title="Datos de acceso">
            <DR label="Correo" value={selected.correo} full />
            <DR label="Estado" value={selected.estado_usuario} />
          </DetailSection>
          <DetailSection title="Datos de la empresa">
            <DR label="RUC" value={selected.ruc} />
            <DR label="Razón social" value={selected.razon_social} />
            <DR label="Nombre comercial" value={selected.nombre_comercial} />
            <DR label="Sector" value={selected.sector} />
            <DR label="Teléfono" value={selected.telefono} />
            <DR label="Página web" value={selected.pagina_web} />
            <DR label="Dirección" value={selected.direccion} full />
          </DetailSection>
        </DetailModal>
      )}
      <PageHeader title="Gestión de Empresas" subtitle={`${empresasPage.total} empresas registradas`} action={<Btn onClick={() => setCreating(true)}><Plus size={14} /> Nueva Empresa</Btn>} />
      <Card>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", gap: 10 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por razón social, RUC, sector o correo..." />
          <select value={sectorFiltro} onChange={e => setSectorFiltro(e.target.value)} style={{ padding: "7px 11px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit" }}>
            <option>Todos</option>
            {sectores.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} style={{ padding: "7px 11px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit" }}>
            <option>Todos</option><option>Activo</option><option>Inactivo</option>
          </select>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><TH label="RUC" /><TH label="Razón social" /><TH label="Nombre comercial" /><TH label="Sector" /><TH label="Teléfono" /><TH label="Página web" /><TH label="Estado" /><TH label="Acciones" /></tr></thead>
          <tbody>
            {filtered.length === 0 && <EmptyState />}
            {filtered.map((e, i) => (
              <tr key={i}>
                <TD mono>{e.ruc}</TD>
                <TD><span style={{ fontWeight: 600 }}>{e.razon_social}</span></TD>
                <TD>{e.nombre_comercial}</TD>
                <TD><span style={{ padding: "3px 10px", background: "#F1F5F9", borderRadius: 6, fontSize: 12 }}>{e.sector}</span></TD>
                <TD>{e.telefono}</TD>
                <TD>{websiteHref(e.pagina_web) ? <a href={websiteHref(e.pagina_web) ?? undefined} target="_blank" rel="noreferrer" style={{ color: "#2563EB", fontSize: 12 }}>{e.pagina_web}</a> : "—"}</TD>
                <TD><StatusBadge label={e.estado_usuario} /></TD>
                <TD>
                  <div style={{ display: "flex", gap: 2 }}>
                    <Btn variant="outline" small onClick={() => setSelected(e)}><Eye size={14} /></Btn>
                    <Btn variant="ghost" small onClick={() => setEditing(e)}><Edit2 size={14} /></Btn>
                    <Btn variant="outline" small onClick={() => handleToggleEstado(e)}>{e.estado_usuario === "Inactivo" ? "Reactivar" : "Desactivar"}</Btn>
                  </div>
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination total={empresasPage.total} showing={filtered.length} page={empresasPage.page} pageSize={empresasPage.pageSize} onPageChange={setPage} />
      </Card>
    </div>
  );
}

// ─── ADMIN: Ofertas ───────────────────────────────────────────────────────────
function AdminOfertas({ useApi = true, setScreen }: { useApi?: boolean; setScreen?: (s: Screen) => void }) {
  const { toast, requestConfirmation } = useFeedback();
  const [selected, setSelected] = useState<AdminOferta | null>(null);
  const [editing, setEditing] = useState<AdminOferta | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("Todos");
  const [modalidadFiltro, setModalidadFiltro] = useState("Todos");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const localOfertas = (OFERTAS as AdminOferta[]).filter(o => {
    const q = search.toLowerCase();
    return `${o.titulo} ${o.puesto} ${o.area} ${o.ubicacion} ${o.empresa}`.toLowerCase().includes(q) && (estadoFiltro === "Todos" || o.estado_oferta === estadoFiltro) && (modalidadFiltro === "Todos" || o.modalidad === modalidadFiltro);
  });
  const fallback = paginatedFallback(localOfertas, page);
  const remotePage = usePaginatedApiData(
    true,
    () => (useApi ? adminApi.ofertas : empresaApi.ofertas)({ page, pageSize: DEFAULT_PAGE_SIZE, search, estado: estadoFiltro, modalidad: modalidadFiltro }),
    fallback,
    [useApi, page, search, estadoFiltro, modalidadFiltro, refreshKey]
  );
  const ofertasPage = remotePage;
  const filtered = ofertasPage.items;
  const empresasOfertaFallback: PaginatedResponse<AdminEmpresa> = { items: [], total: 0, page: 1, pageSize: 100 };
  const empresasOfertaPage = usePaginatedApiData(
    useApi,
    () => adminApi.empresas({ page: 1, pageSize: 100, estado: "Activo" }),
    empresasOfertaFallback,
    [useApi, refreshKey]
  );
  const empresasActivas = empresasOfertaPage.items;

  useEffect(() => {
    setPage(1);
  }, [search, estadoFiltro, modalidadFiltro]);

  function handleEditOferta(oferta: AdminOferta) {
    setEditing(oferta);
  }

  async function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = readOfertaForm(event.currentTarget);
    if (!payload) return;
    if (!payload.id_empresa || !Number.isInteger(payload.id_empresa) || payload.id_empresa <= 0) {
      toast("warning", "Selecciona una empresa activa para publicar la oferta.");
      return;
    }

    setSavingCreate(true);
    try {
      await adminApi.crearOferta(payload);
      toast("success", "Oferta creada correctamente.");
      setRefreshKey(k => k + 1);
      setCreating(false);
    } catch (error) {
      toast("error", getErrorMessage(error));
    } finally {
      setSavingCreate(false);
    }
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    const payload = readOfertaForm(event.currentTarget);
    if (!payload) return;

    setSavingEdit(true);
    try {
      if (useApi) {
        await adminApi.actualizarOferta(editing.id_oferta, payload);
      } else {
        await empresaApi.actualizarOferta(editing.id_oferta, payload);
      }
      toast("success", "Oferta actualizada correctamente.");
      setRefreshKey(k => k + 1);
      setEditing(null);
      setSelected(null);
    } catch (error) {
      toast("error", getErrorMessage(error));
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleToggleOfertaEstado(oferta: AdminOferta) {
    const nextEstado = oferta.estado_oferta === "Cerrada" ? "Activa" : "Cerrada";
    const confirmed = await requestConfirmation({
      title: nextEstado === "Activa" ? "Reactivar oferta" : "Cerrar oferta",
      message: `¿Deseas ${nextEstado === "Activa" ? "reactivar" : "cerrar"} la oferta "${oferta.titulo}"?`,
      confirmLabel: nextEstado === "Activa" ? "Reactivar" : "Cerrar",
      variant: nextEstado === "Activa" ? "primary" : "danger",
    });
    if (!confirmed) {
      toast("info", "Operación cancelada.");
      return;
    }

    try {
      if (useApi) {
        await adminApi.cambiarEstadoOferta(oferta.id_oferta, nextEstado);
      } else {
        await empresaApi.cambiarEstadoOferta(oferta.id_oferta, nextEstado);
      }
      toast("success", nextEstado === "Activa" ? "Oferta reactivada correctamente." : "Oferta cerrada correctamente.");
      setRefreshKey(k => k + 1);
      setSelected(null);
    } catch (error) {
      toast("error", getErrorMessage(error));
    }
  }

  async function handleDeleteOferta(oferta: AdminOferta) {
    const confirmed = await requestConfirmation({
      title: "Eliminar oferta",
      message: `¿Deseas eliminar la oferta "${oferta.titulo}"? Esta acción solo se permite si no tiene postulaciones asociadas.`,
      confirmLabel: "Eliminar",
      variant: "danger",
    });
    if (!confirmed) {
      toast("info", "Operación cancelada.");
      return;
    }

    try {
      if (useApi) {
        await adminApi.eliminarOferta(oferta.id_oferta);
      } else {
        await empresaApi.eliminarOferta(oferta.id_oferta);
      }
      toast("success", "Oferta eliminada correctamente.");
      setRefreshKey(k => k + 1);
      setSelected(null);
    } catch (error) {
      toast("error", getErrorMessage(error));
    }
  }

  return (
    <div>
      {creating && (
        <DetailModal title="Crear Oferta Laboral" onClose={() => setCreating(false)}>
          <form onSubmit={handleCreateSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <FormField label="Empresa" required>
                  <select name="id_empresa" style={INP} required defaultValue="">
                    <option value="" disabled>Seleccionar empresa activa</option>
                    {empresasActivas.map(e => <option key={e.id_usuario} value={e.id_usuario}>{e.razon_social}</option>)}
                  </select>
                </FormField>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <FormField label="Título" required hint="Máximo 150 caracteres."><input name="titulo" style={INP} maxLength={150} required /></FormField>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <FormField label="Descripción" required><textarea name="descripcion" style={{ ...INP, height: 100, resize: "vertical" }} required /></FormField>
              </div>
              <FormField label="Puesto" required><input name="puesto" style={INP} required /></FormField>
              <FormField label="Área" required><input name="area" style={INP} required /></FormField>
              <FormField label="Ubicación" required><input name="ubicacion" style={INP} required /></FormField>
              <FormField label="Modalidad" required>
                <select name="modalidad" style={INP} defaultValue="Presencial" required>
                  <option>Presencial</option><option>Remoto</option><option>Híbrido</option>
                </select>
              </FormField>
              <FormField label="Tipo de contrato" required>
                <select name="tipo_contrato" style={INP} defaultValue="Indefinido" required>
                  <option>Indefinido</option><option>Temporal</option><option>Practicante</option>
                </select>
              </FormField>
              <FormField label="Salario" hint="Campo opcional. Dejar vacío si no se desea publicar."><input name="salario" style={INP} type="number" step="0.01" /></FormField>
              <div style={{ gridColumn: "1 / -1" }}>
                <FormField label="Requisitos" hint="Campo opcional."><textarea name="requisitos" style={{ ...INP, height: 80, resize: "vertical" }} /></FormField>
              </div>
              <FormField label="Fecha de cierre" required hint="La fecha de cierre debe ser posterior a la publicación."><input name="fecha_cierre" style={INP} type="date" required /></FormField>
              <FormField label="Estado" required>
                <select name="estado_oferta" style={INP} defaultValue="Activa" required>
                  <option>Activa</option><option>Cerrada</option>
                </select>
              </FormField>
            </div>
            <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid #F1F5F9", display: "flex", gap: 10 }}>
              <button type="submit" disabled={savingCreate || empresasActivas.length === 0} style={{ padding: "11px 26px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: savingCreate || empresasActivas.length === 0 ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: savingCreate || empresasActivas.length === 0 ? 0.65 : 1 }}>{savingCreate ? "Guardando..." : "Crear oferta"}</button>
              <Btn variant="outline" onClick={() => setCreating(false)} disabled={savingCreate}>Cancelar</Btn>
            </div>
          </form>
        </DetailModal>
      )}
      {editing && (
        <DetailModal title={`Editar Oferta: ${editing.titulo}`} onClose={() => setEditing(null)}>
          <form onSubmit={handleEditSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <FormField label="Título" required hint="Máximo 150 caracteres."><input name="titulo" style={INP} defaultValue={editing.titulo} maxLength={150} required /></FormField>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <FormField label="Descripción" required><textarea name="descripcion" style={{ ...INP, height: 100, resize: "vertical" }} defaultValue={editing.descripcion} required /></FormField>
              </div>
              <FormField label="Puesto" required><input name="puesto" style={INP} defaultValue={editing.puesto} required /></FormField>
              <FormField label="Área" required><input name="area" style={INP} defaultValue={editing.area} required /></FormField>
              <FormField label="Ubicación" required><input name="ubicacion" style={INP} defaultValue={editing.ubicacion} required /></FormField>
              <FormField label="Modalidad" required>
                <select name="modalidad" style={INP} defaultValue={editing.modalidad} required>
                  <option>Presencial</option><option>Remoto</option><option>Híbrido</option>
                </select>
              </FormField>
              <FormField label="Tipo de contrato" required>
                <select name="tipo_contrato" style={INP} defaultValue={editing.tipo_contrato} required>
                  <option>Indefinido</option><option>Temporal</option><option>Practicante</option>
                </select>
              </FormField>
              <FormField label="Salario" hint="Campo opcional. Dejar vacío si no se desea publicar."><input name="salario" style={INP} type="number" step="0.01" defaultValue={editing.salario ?? ""} /></FormField>
              <div style={{ gridColumn: "1 / -1" }}>
                <FormField label="Requisitos" hint="Campo opcional."><textarea name="requisitos" style={{ ...INP, height: 80, resize: "vertical" }} defaultValue={editing.requisitos ?? ""} /></FormField>
              </div>
              <FormField label="Fecha de cierre" required><input name="fecha_cierre" style={INP} type="date" defaultValue={toDateInputValue(editing.fecha_cierre)} required /></FormField>
              <FormField label="Estado" required>
                <select name="estado_oferta" style={INP} defaultValue={editing.estado_oferta} required>
                  <option>Activa</option><option>Cerrada</option>
                </select>
              </FormField>
            </div>
            <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid #F1F5F9", display: "flex", gap: 10 }}>
              <button type="submit" disabled={savingEdit} style={{ padding: "11px 26px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: savingEdit ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: savingEdit ? 0.65 : 1 }}>{savingEdit ? "Guardando..." : "Guardar cambios"}</button>
              <Btn variant="outline" onClick={() => setEditing(null)} disabled={savingEdit}>Cancelar</Btn>
            </div>
          </form>
        </DetailModal>
      )}
      {selected && (
        <DetailModal title={`Detalle Oferta: ${selected.titulo}`} onClose={() => setSelected(null)}>
          <DetailSection title="Datos de la oferta">
            <DR label="Título" value={selected.titulo} />
            <DR label="Puesto" value={selected.puesto} />
            <DR label="Área" value={selected.area} />
            <DR label="Ubicación" value={selected.ubicacion} />
            <DR label="Modalidad" value={selected.modalidad} />
            <DR label="Tipo de contrato" value={selected.tipo_contrato} />
            <DR label="Salario" value={selected.salario != null ? `S/. ${selected.salario.toLocaleString()}` : "—"} />
            <DR label="Fecha de publicación" value={selected.fecha_publicacion} />
            <DR label="Fecha de cierre" value={selected.fecha_cierre} />
            <DR label="Estado" value={selected.estado_oferta} />
            <DR label="Empresa" value={selected.empresa} />
            <DR label="Descripción" value={selected.descripcion} full />
            <DR label="Requisitos" value={selected.requisitos} full />
          </DetailSection>
        </DetailModal>
      )}
      <PageHeader title={useApi ? "Gestión de Ofertas Laborales" : "Mis Ofertas"} subtitle={`${ofertasPage.total} ofertas registradas`} action={<Btn onClick={() => useApi ? setCreating(true) : setScreen?.("emp-crear-oferta")}><Plus size={14} /> Crear Oferta</Btn>} />
      <Card>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", gap: 10 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por título, puesto, área, ubicación o empresa..." />
          <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} style={{ padding: "7px 11px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit" }}>
            <option>Todos</option><option>Activa</option><option>Cerrada</option>
          </select>
          <select value={modalidadFiltro} onChange={e => setModalidadFiltro(e.target.value)} style={{ padding: "7px 11px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit" }}>
            <option>Todos</option><option>Presencial</option><option>Remoto</option><option>Híbrido</option>
          </select>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH label="Título" /><TH label="Empresa" /><TH label="Puesto" /><TH label="Área" /><TH label="Modalidad" /><TH label="Salario" /><TH label="Publicación" /><TH label="Cierre" /><TH label="Estado" /><TH label="Acciones" /></tr></thead>
            <tbody>
              {filtered.length === 0 && <EmptyState />}
              {filtered.map((o, i) => (
                <tr key={i}>
                  <TD><span style={{ fontWeight: 600 }}>{o.titulo}</span></TD>
                  <TD>{o.empresa}</TD>
                  <TD>{o.puesto}</TD>
                  <TD>{o.area}</TD>
                  <TD><span style={{ padding: "3px 10px", background: "#F1F5F9", borderRadius: 6, fontSize: 12 }}>{o.modalidad}</span></TD>
                  <TD><span style={{ fontWeight: 600, color: "#10B981" }}>{o.salario != null ? `S/. ${o.salario.toLocaleString()}` : "—"}</span></TD>
                  <TD>{o.fecha_publicacion}</TD>
                  <TD>{o.fecha_cierre}</TD>
                  <TD><StatusBadge label={o.estado_oferta} /></TD>
                  <TD>
                    <div style={{ display: "flex", gap: 2 }}>
                      <Btn variant="outline" small onClick={() => setSelected(o)}><Eye size={14} /></Btn>
                      <Btn variant="ghost" small onClick={() => handleEditOferta(o)}><Edit2 size={14} /></Btn>
                      <Btn variant="outline" small onClick={() => handleToggleOfertaEstado(o)}>{o.estado_oferta === "Cerrada" ? "Reactivar" : "Cerrar"}</Btn>
                      <Btn variant="danger" small onClick={() => handleDeleteOferta(o)}><Trash2 size={14} /></Btn>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={ofertasPage.total} showing={filtered.length} page={ofertasPage.page} pageSize={ofertasPage.pageSize} onPageChange={setPage} />
      </Card>
    </div>
  );
}

// ─── ADMIN: Encuestas ─────────────────────────────────────────────────────────
function AdminEncuestas() {
  const { toast } = useFeedback();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminEncuesta | null>(null);
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("Todos");
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const localEncuestas = (ENCUESTAS as AdminEncuesta[]).filter(e => {
    const q = search.toLowerCase();
    return `${e.egresado} ${e.nombre_empresa_actual ?? ""} ${e.cargo_actual ?? ""} ${e.area_trabajo ?? ""}`.toLowerCase().includes(q) && (estadoFiltro === "Todos" || e.estado_laboral === estadoFiltro);
  });
  const fallback = paginatedFallback(localEncuestas, page);
  const encuestasPage = usePaginatedApiData(
    true,
    () => adminApi.encuestas({ page, pageSize: DEFAULT_PAGE_SIZE, search, estadoLaboral: estadoFiltro }),
    fallback,
    [page, search, estadoFiltro]
  );
  const filtered = encuestasPage.items;

  useEffect(() => {
    setPage(1);
  }, [search, estadoFiltro]);

  async function exportEncuestas(format: "pdf" | "excel") {
    setExporting(format);
    try {
      const params = { search, estadoLaboral: estadoFiltro };
      const file = format === "pdf"
        ? await adminApi.exportarEncuestasPdf(params)
        : await adminApi.exportarEncuestasExcel(params);
      downloadBlob(file.blob, file.filename);
      toast("success", format === "pdf" ? "PDF generado correctamente." : "Excel generado correctamente.");
    } catch (error) {
      toast("error", getErrorMessage(error));
    } finally {
      setExporting(null);
    }
  }

  return (
    <div>
      {selected && (
        <DetailModal title={`Encuesta #${selected.id_encuesta} — ${selected.egresado}`} onClose={() => setSelected(null)}>
          <DetailSection title="Egresado">
            <DR label="Egresado" value={selected.egresado} />
            <DR label="Fecha de asociación" value={selected.fecha_asociacion} />
          </DetailSection>
          <DetailSection title="Respuesta">
            <DR label="Fecha de registro" value={selected.fecha_registro} />
            <DR label="Estado laboral" value={selected.estado_laboral} />
            <DR label="Empresa actual" value={selected.nombre_empresa_actual ?? "—"} />
            <DR label="Cargo actual" value={selected.cargo_actual ?? "—"} />
            <DR label="Área de trabajo" value={selected.area_trabajo} />
            <DR label="Sueldo mensual" value={selected.sueldo_mensual != null ? `S/. ${selected.sueldo_mensual.toLocaleString()}` : "—"} />
            <DR label="Tipo de contrato" value={selected.tipo_contrato ?? "—"} />
            <DR label="Satisfacción profesional" value={selected.satisfaccion_profesional} />
            <DR label="Tiempo para conseguir empleo" value={selected.tiempo_conseguir_empleo} />
            <DR label="Observaciones" value={selected.observaciones} full />
          </DetailSection>
        </DetailModal>
      )}
      <PageHeader
        title="Gestión de Encuestas"
        subtitle={`${encuestasPage.total} encuestas respondidas`}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="outline" onClick={() => exportEncuestas("pdf")} disabled={exporting !== null}>
              <Download size={14} /> {exporting === "pdf" ? "Generando..." : "Exportar PDF"}
            </Btn>
            <Btn variant="success" onClick={() => exportEncuestas("excel")} disabled={exporting !== null}>
              <Download size={14} /> {exporting === "excel" ? "Generando..." : "Exportar Excel"}
            </Btn>
          </div>
        }
      />
      <Card>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10, flex: 1 }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Buscar por egresado, empresa, cargo o área..." />
            <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} style={{ padding: "7px 11px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit" }}>
              <option>Todos</option>
              {["Empleado", "Independiente", "Desempleado", "Estudiando", "Emprendedor"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ fontSize: 12, color: "#64748B", textAlign: "right" }}>
            Las encuestas respondidas forman parte del historial del egresado y no se eliminan.
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><TH label="Egresado" /><TH label="Estado laboral" /><TH label="Empresa actual" /><TH label="Cargo actual" /><TH label="Sueldo mensual" /><TH label="Tipo de contrato" /><TH label="Fecha de registro" /><TH label="Acciones" /></tr></thead>
          <tbody>
            {filtered.length === 0 && <EmptyState />}
            {filtered.map((e, i) => (
              <tr key={i}>
                <TD><span style={{ fontWeight: 600 }}>{e.egresado}</span></TD>
                <TD><StatusBadge label={e.estado_laboral} /></TD>
                <TD>{e.nombre_empresa_actual ?? "—"}</TD>
                <TD>{e.cargo_actual ?? "—"}</TD>
                <TD><span style={{ fontWeight: 500, color: e.sueldo_mensual ? "#10B981" : "#94A3B8" }}>{e.sueldo_mensual ? `S/. ${e.sueldo_mensual.toLocaleString()}` : "—"}</span></TD>
                <TD>{e.tipo_contrato ?? "—"}</TD>
                <TD>{e.fecha_registro}</TD>
                <TD>
                  <div style={{ display: "flex", gap: 2 }}>
                    <Btn variant="outline" small onClick={() => setSelected(e)}><Eye size={14} /></Btn>
                  </div>
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination total={encuestasPage.total} showing={filtered.length} page={encuestasPage.page} pageSize={encuestasPage.pageSize} onPageChange={setPage} />
      </Card>
    </div>
  );
}

// ─── ADMIN: Reportes ──────────────────────────────────────────────────────────
function Reportes() {
  const { toast } = useFeedback();
  const [facultadFiltro, setFacultadFiltro] = useState("Todas las facultades");
  const [carreraFiltro, setCarreraFiltro] = useState("Todas las carreras");
  const [anioFiltro, setAnioFiltro] = useState("Todos los años");
  const [estadoLaboralFiltro, setEstadoLaboralFiltro] = useState("Todos los estados laborales");
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [appliedFilters, setAppliedFilters] = useState({
    facultad: "",
    carrera: "",
    anio: "",
    estadoLaboral: "",
  });
  const carrerasDisponibles = facultadFiltro === "Todas las facultades"
    ? Object.values(CARRERAS).flat()
    : CARRERAS[facultadFiltro] ?? [];
  const loadReportes = useCallback(() => adminApi.dashboard(appliedFilters), [appliedFilters]);
  const dashboard = useApiData(true, loadReportes, ADMIN_DASHBOARD_FALLBACK);
  const noReportData = Object.values(dashboard.counts).every((value) => Number(value) === 0);
  const carreraChartEmpty = isEmptySeries(dashboard.charts.egresadosPorCarrera as unknown as Record<string, unknown>[], ["egresados"]);
  const facultadChartEmpty = isEmptySeries(dashboard.charts.egresadosPorFacultad as unknown as Record<string, unknown>[], ["value"]);
  const laboralChartEmpty = isEmptySeries(dashboard.charts.estadoLaboral as unknown as Record<string, unknown>[], ["value"]);
  const ofertasChartEmpty = isEmptySeries(dashboard.charts.ofertasHistorial as unknown as Record<string, unknown>[], ["activas", "cerradas"]);
  const postulacionesChartEmpty = isEmptySeries(dashboard.charts.postulacionesEvolucion as unknown as Record<string, unknown>[], ["postulaciones"]);
  const sel: React.CSSProperties = { padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit", background: "#fff" };
  const applyFilters = () => {
    setAppliedFilters({
      facultad: facultadFiltro === "Todas las facultades" ? "" : facultadFiltro,
      carrera: carreraFiltro === "Todas las carreras" ? "" : carreraFiltro,
      anio: anioFiltro === "Todos los años" ? "" : anioFiltro,
      estadoLaboral: estadoLaboralFiltro === "Todos los estados laborales" ? "" : estadoLaboralFiltro,
    });
  };

  async function exportReportes(format: "pdf" | "excel") {
    setExporting(format);
    try {
      const file = format === "pdf"
        ? await adminApi.exportarReportePdf(appliedFilters)
        : await adminApi.exportarReporteExcel(appliedFilters);
      downloadBlob(file.blob, file.filename);
      toast("success", format === "pdf" ? "PDF generado correctamente." : "Excel generado correctamente.");
    } catch (error) {
      toast("error", getErrorMessage(error));
    } finally {
      setExporting(null);
    }
  }

  useEffect(() => {
    if (carreraFiltro !== "Todas las carreras" && !carrerasDisponibles.includes(carreraFiltro)) {
      setCarreraFiltro("Todas las carreras");
    }
  }, [facultadFiltro, carreraFiltro, carrerasDisponibles]);

  return (
    <div>
      <PageHeader title="Reportes y Estadísticas" subtitle="Información consolidada — Universidad de Huánuco (UDH)"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="outline" onClick={() => exportReportes("pdf")} disabled={exporting !== null}>
              <Download size={14} /> {exporting === "pdf" ? "Generando..." : "Exportar PDF"}
            </Btn>
            <Btn variant="success" onClick={() => exportReportes("excel")} disabled={exporting !== null}>
              <Download size={14} /> {exporting === "excel" ? "Generando..." : "Exportar Excel"}
            </Btn>
          </div>
        }
      />
      <Card style={{ padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Filtrar por:</div>
          <select value={facultadFiltro} onChange={e => setFacultadFiltro(e.target.value)} style={sel}><option>Todas las facultades</option>{FACULTADES.map(f => <option key={f}>{f}</option>)}</select>
          <select value={carreraFiltro} onChange={e => setCarreraFiltro(e.target.value)} style={sel}><option>Todas las carreras</option>{carrerasDisponibles.map(c => <option key={c}>{c}</option>)}</select>
          <select value={anioFiltro} onChange={e => setAnioFiltro(e.target.value)} style={sel}><option>Todos los años</option>{["2026", "2025", "2024", "2023", "2022", "2021"].map(y => <option key={y}>{y}</option>)}</select>
          <select value={estadoLaboralFiltro} onChange={e => setEstadoLaboralFiltro(e.target.value)} style={sel}><option>Todos los estados laborales</option>{["Empleado", "Independiente", "Desempleado", "Estudiando", "Emprendedor"].map(s => <option key={s}>{s}</option>)}</select>
          <button onClick={applyFilters} style={{ padding: "8px 16px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Aplicar</button>
        </div>
      </Card>
      {noReportData && (
        <Card style={{ padding: "14px 18px", marginBottom: 20, color: "#64748B", fontSize: 13 }}>
          No hay información disponible para la combinación de filtros seleccionada.
        </Card>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard icon={<GraduationCap size={21} />} label="Total Egresados" value={dashboard.counts.totalEgresados.toLocaleString()} color="#2563EB" />
        <StatCard icon={<Building2 size={21} />} label="Total Empresas" value={dashboard.counts.totalEmpresas.toLocaleString()} color="#0EA5E9" />
        <StatCard icon={<Briefcase size={21} />} label="Total Ofertas" value={dashboard.counts.totalOfertas.toLocaleString()} color="#6366F1" />
        <StatCard icon={<FileText size={21} />} label="Total Postulaciones" value={dashboard.counts.totalPostulaciones.toLocaleString()} color="#10B981" />
        <StatCard icon={<ClipboardList size={21} />} label="Encuestas respondidas" value={dashboard.counts.totalEncuestas.toLocaleString()} color="#F59E0B" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 18 }}>Egresados por Carrera</div>
          {carreraChartEmpty ? <ChartEmptyState /> : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={dashboard.charts.egresadosPorCarrera} layout="vertical" margin={{ left: 4, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} width={100} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} />
                <Bar dataKey="egresados" name="Egresados" fill="#2563EB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 18 }}>Egresados por Facultad</div>
          {facultadChartEmpty ? <ChartEmptyState /> : (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={dashboard.charts.egresadosPorFacultad} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {dashboard.charts.egresadosPorFacultad.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} />
                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 18 }}>Estado Laboral (%)</div>
          {laboralChartEmpty ? <ChartEmptyState /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={dashboard.charts.estadoLaboral} cx="50%" cy="50%" outerRadius={75} dataKey="value" paddingAngle={3}>
                  {dashboard.charts.estadoLaboral.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} />
                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 18 }}>Ofertas: Activa vs Cerrada</div>
          {ofertasChartEmpty ? <ChartEmptyState /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dashboard.charts.ofertasHistorial}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94A3B8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} />
                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="activas" name="Activa" fill="#2563EB" radius={[3, 3, 0, 0]} />
                <Bar dataKey="cerradas" name="Cerrada" fill="#CBD5E1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 18 }}>Evolución Postulaciones</div>
          {postulacionesChartEmpty ? <ChartEmptyState /> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dashboard.charts.postulacionesEvolucion}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94A3B8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} />
                <Line type="monotone" dataKey="postulaciones" stroke="#6366F1" strokeWidth={2.5} dot={{ fill: "#6366F1", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── ADMIN: Configuración ─────────────────────────────────────────────────────
function Configuracion() {
  const { toast } = useFeedback();
  const [estado, setEstado] = useState("Activo");
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const loadConfiguracion = useCallback(() => {
    void refreshKey;
    return adminApi.configuracion();
  }, [refreshKey]);
  const config = useApiData<ConfiguracionSistema | null>(true, loadConfiguracion, null);

  useEffect(() => {
    if (config?.estado_sistema) {
      setEstado(config.estado_sistema);
    }
  }, [config?.estado_sistema]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await adminApi.actualizarConfiguracion({
        nombre_universidad: String(form.get("nombre_universidad") ?? "").trim(),
        correo_institucional: String(form.get("correo_institucional") ?? "").trim(),
        telefono: String(form.get("telefono") ?? "").trim(),
        logo_url: String(form.get("logo_url") ?? "").trim(),
        tiempo_entre_encuestas_meses: Number(form.get("tiempo_entre_encuestas_meses")),
        estado_sistema: estado,
        version_sistema: String(form.get("version_sistema") ?? "").trim(),
      });
      toast("success", "Configuración actualizada correctamente.");
      setRefreshKey(k => k + 1);
    } catch (error) {
      toast("error", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Configuración del Sistema" subtitle="Parámetros generales de la plataforma" />
      <form onSubmit={handleSubmit}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 900 }}>
        <Card style={{ padding: 28 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A", marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid #F1F5F9" }}>Datos Institucionales</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <FormField label="Nombre de la Universidad" required><input name="nombre_universidad" style={INP} defaultValue={config?.nombre_universidad ?? ""} key={config?.nombre_universidad ?? "nombre"} required /></FormField>
            <FormField label="Correo institucional"><input name="correo_institucional" style={INP} defaultValue={config?.correo_institucional ?? ""} key={config?.correo_institucional ?? "correo"} type="email" /></FormField>
            <FormField label="Teléfono"><input name="telefono" style={INP} defaultValue={config?.telefono ?? ""} key={config?.telefono ?? "telefono"} /></FormField>
            <FormField label="Logo URL"><input name="logo_url" style={INP} defaultValue={config?.logo_url ?? ""} key={config?.logo_url ?? "logo"} placeholder="https://..." /></FormField>
            <FormField label="Logo de la Universidad">
              <div style={{ border: "2px dashed #D1D5DB", borderRadius: 8, padding: "20px", textAlign: "center", cursor: "pointer" }}>
                <Upload size={22} color="#9CA3AF" style={{ margin: "0 auto 8px" }} />
                <div style={{ fontSize: 13, color: "#64748B" }}>Haz clic para subir el logo</div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>PNG, JPG — máx. 2 MB</div>
              </div>
            </FormField>
          </div>
        </Card>
        <Card style={{ padding: 28 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A", marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid #F1F5F9" }}>Configuración del Sistema</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <FormField label="Tiempo entre encuestas laborales (meses)" required hint="Controla cada cuántos meses se habilita una nueva encuesta.">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input name="tiempo_entre_encuestas_meses" style={{ ...INP, width: 90 }} type="number" defaultValue={config?.tiempo_entre_encuestas_meses ?? 0} key={config?.tiempo_entre_encuestas_meses ?? "meses"} min={0} max={24} />
                <span style={{ fontSize: 13, color: "#64748B" }}>meses</span>
              </div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>0 = permitir responder inmediatamente.</div>
            </FormField>
            <FormField label="Estado del sistema" required>
              <div style={{ display: "flex", gap: 10 }}>
                {["Activo", "Inactivo"].map(opt => (
                  <button type="button" key={opt} onClick={() => setEstado(opt)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "2px solid", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 13, borderColor: estado === opt ? (opt === "Activo" ? "#10B981" : "#EF4444") : "#E2E8F0", background: estado === opt ? (opt === "Activo" ? "#DCFCE7" : "#FEE2E2") : "#fff", color: estado === opt ? (opt === "Activo" ? "#166534" : "#991B1B") : "#64748B" }}>
                    {opt === "Activo" ? "● Activo" : "○ Inactivo"}
                  </button>
                ))}
              </div>
            </FormField>
            <div style={{ padding: "14px 16px", background: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 8 }}>Información del sistema</div>
              <FormField label="Versión del sistema" required><input name="version_sistema" style={INP} defaultValue={config?.version_sistema ?? ""} key={config?.version_sistema ?? "version"} required /></FormField>
              {[{ label: "Administradores registrados", value: "3" }, { label: "Última actualización", value: config?.fecha_actualizacion ?? "Sin datos" }].map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: i < 1 ? "1px solid #F1F5F9" : "none" }}>
                  <span style={{ color: "#64748B" }}>{r.label}</span>
                  <span style={{ fontWeight: 600, color: "#0F172A" }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
      <div style={{ marginTop: 24 }}><button type="submit" disabled={saving || !config} style={{ padding: "11px 26px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving || !config ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving || !config ? 0.65 : 1 }}>{saving ? "Guardando..." : "Guardar Configuración"}</button></div>
      </form>
    </div>
  );
}

// ─── ADMIN: Auditoría ─────────────────────────────────────────────────────────
function Auditoria() {
  const [search, setSearch] = useState("");
  const [tablaFiltro, setTablaFiltro] = useState("Todas");
  const [accionFiltro, setAccionFiltro] = useState("Todas");
  const [page, setPage] = useState(1);
  const localAuditoria = (AUDITORIA_DATA as AdminAuditoria[]).filter(a => {
    const q = search.toLowerCase();
    return `${a.descripcion} ${a.usuario_bd} ${a.tabla_afectada}`.toLowerCase().includes(q) && (tablaFiltro === "Todas" || a.tabla_afectada === tablaFiltro) && (accionFiltro === "Todas" || a.accion === accionFiltro);
  });
  const fallback = paginatedFallback(localAuditoria, page);
  const auditoriaPage = usePaginatedApiData(
    true,
    () => adminApi.auditoria({ page, pageSize: DEFAULT_PAGE_SIZE, search, tabla: tablaFiltro, accion: accionFiltro }),
    fallback,
    [page, search, tablaFiltro, accionFiltro]
  );
  const filtered = auditoriaPage.items;
  const tablas = [...new Set((AUDITORIA_DATA as AdminAuditoria[]).concat(filtered).map(a => a.tabla_afectada))];

  useEffect(() => {
    setPage(1);
  }, [search, tablaFiltro, accionFiltro]);

  return (
    <div>
      <PageHeader title="Auditoría del Sistema" subtitle={`${auditoriaPage.total} eventos registrados`} />
      <Card>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", gap: 10, alignItems: "center" }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por descripción, usuario o tabla..." />
          <select value={tablaFiltro} onChange={e => setTablaFiltro(e.target.value)} style={{ padding: "7px 11px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit" }}>
            <option>Todas</option>
            {tablas.map(t => <option key={t} value={t}>{humanizeTechnicalText(t)}</option>)}
          </select>
          <select value={accionFiltro} onChange={e => setAccionFiltro(e.target.value)} style={{ padding: "7px 11px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit" }}>
            <option>Todas</option>
            <option value="INSERT">Crear</option>
            <option value="UPDATE">Actualizar</option>
            <option value="DELETE">Eliminar</option>
          </select>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH label="Código" /><TH label="Tabla afectada" /><TH label="Acción" /><TH label="Registro" /><TH label="Descripción" /><TH label="Fecha" /><TH label="Usuario" /></tr></thead>
            <tbody>
              {filtered.length === 0 && <EmptyState />}
              {filtered.map((a, i) => (
                <tr key={i}>
                  <TD mono>{a.id_auditoria}</TD>
                  <TD><span style={{ padding: "3px 9px", background: "#EFF6FF", borderRadius: 6, fontSize: 12, color: "#1E40AF", fontWeight: 500 }}>{humanizeTechnicalText(a.tabla_afectada)}</span></TD>
                  <TD><Badge label={humanizeAction(a.accion)} variant={STATUS_MAP[a.accion] ?? "neutral"} /></TD>
                  <TD mono>{a.id_registro}</TD>
                  <TD><span style={{ fontSize: 12, color: "#64748B" }}>{humanizeTechnicalText(a.descripcion)}</span></TD>
                  <TD><span style={{ fontSize: 12 }}>{a.fecha_evento}</span></TD>
                  <TD>{humanizeAuditUser(a.usuario_bd)}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={auditoriaPage.total} showing={filtered.length} page={auditoriaPage.page} pageSize={auditoriaPage.pageSize} onPageChange={setPage} />
      </Card>
    </div>
  );
}

// ─── ADMIN: Evidencias SQL ───────────────────────────────────────────────────
type SqlEvidenceSection = "vistas" | "funciones" | "procedimientos" | "auditoria" | "signal" | "roles";

const SQL_SECTION_LABELS: Record<SqlEvidenceSection, string> = {
  vistas: "Vistas",
  funciones: "Funciones",
  procedimientos: "Procedimientos",
  auditoria: "Auditoría",
  signal: "SIGNAL",
  roles: "Usuarios y permisos",
};

function SqlResultTable({ rows }: { rows?: Record<string, unknown>[] }) {
  const data = rows ?? [];
  if (data.length === 0) {
    return <div style={{ padding: "14px 16px", fontSize: 13, color: "#64748B" }}>Sin filas para mostrar.</div>;
  }
  const columns = Object.keys(data[0]).slice(0, 8);
  return (
    <div style={{ overflowX: "auto", borderTop: "1px solid #F1F5F9" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{columns.map(c => <TH key={c} label={humanizeTechnicalText(c)} />)}</tr></thead>
        <tbody>
          {data.slice(0, 20).map((row, i) => (
            <tr key={i}>{columns.map(c => <TD key={c}>{String(row[c] ?? "—")}</TD>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SqlObjectRow({
  item,
  actionLabel,
  running,
  onRun,
}: {
  item: SqlEvidenceObject;
  actionLabel: string;
  running?: boolean;
  onRun: () => void;
}) {
  return (
    <tr>
      <TD mono>{item.name}</TD>
      <TD>{item.description}</TD>
      <TD>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {item.usesJoins && <Badge label="JOIN" variant="info" />}
          {item.usesFunctions && <Badge label="Función" variant="success" />}
          {item.hasTwoParams && <Badge label="2+ parámetros" variant="neutral" />}
          {item.category && <Badge label={item.category === "numerica" ? "Numérica" : item.category === "texto" ? "Texto" : item.category === "lectura" ? "Lectura" : "Escritura"} variant={item.category === "escritura" ? "warning" : "info"} />}
          <Badge label="Flujo real" variant="success" />
        </div>
      </TD>
      <TD>
        <div>{item.realUsage ?? item.parameters?.join(", ") ?? item.restrictions?.join("; ") ?? item.safeMode ?? "—"}</div>
        {item.realEndpoint && <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>{item.realEndpoint}</div>}
      </TD>
      <TD>
        <div style={{ fontSize: 12, color: "#475569" }}>{item.backendFile ?? "backend/src/modules/admin-sql-evidencias/admin-sql-evidencias.service.ts"}</div>
      </TD>
      <TD><Btn variant="outline" small disabled={running} onClick={onRun}>{running ? "Ejecutando..." : actionLabel}</Btn></TD>
    </tr>
  );
}

function SqlEvidencias() {
  const { toast } = useFeedback();
  const [section, setSection] = useState<SqlEvidenceSection>("vistas");
  const [runningKey, setRunningKey] = useState("");
  const [resultTitle, setResultTitle] = useState("Resultado");
  const [result, setResult] = useState<SqlRunResult | null>(null);
  const [recentAudit, setRecentAudit] = useState<AdminAuditoria[]>([]);
  const overview = useApiData<SqlEvidenceOverview | null>(true, adminApi.sqlEvidencias, null);

  const loadRecentAudit = useCallback(async () => {
    try {
      setRecentAudit(await adminApi.auditoriaSqlReciente());
    } catch (error) {
      toast("error", getErrorMessage(error));
    }
  }, [toast]);

  useEffect(() => {
    if (section === "auditoria") {
      loadRecentAudit();
    }
  }, [section, loadRecentAudit]);

  async function runControlled(key: string, title: string, runner: () => Promise<SqlRunResult>) {
    setRunningKey(key);
    try {
      const data = await runner();
      setResultTitle(title);
      setResult(data);
      toast("success", data.message ?? "Evidencia ejecutada correctamente.");
      if (section === "auditoria") await loadRecentAudit();
    } catch (error) {
      toast("error", getErrorMessage(error));
    } finally {
      setRunningKey("");
    }
  }

  if (!overview) {
    return (
      <div>
        <PageHeader title="Evidencias SQL" subtitle="Cargando matriz de cumplimiento..." />
        <Card style={{ padding: 20 }}><div style={{ fontSize: 13, color: "#64748B" }}>Conectando con el backend.</div></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Evidencias SQL" subtitle="Objetos SQL integrados al funcionamiento real del sistema" />

      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 14 }}>Matriz de cumplimiento</div>
            <div style={{ color: "#64748B", fontSize: 12, marginTop: 3 }}>{overview.note}</div>
          </div>
          <Badge label="Solo Admin" variant="info" />
        </div>
        <SqlResultTable rows={overview.matrix.map(m => ({ Tipo: m.type, Exigido: m.required, Implementado: m.implemented, Pantalla: m.screen, Endpoint: m.endpoint }))} />
      </Card>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {(Object.keys(SQL_SECTION_LABELS) as SqlEvidenceSection[]).map(key => (
          <button key={key} onClick={() => setSection(key)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0", background: section === key ? "#2563EB" : "#fff", color: section === key ? "#fff" : "#334155", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {SQL_SECTION_LABELS[key]}
          </button>
        ))}
      </div>

      {section === "vistas" && (
        <Card>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", fontWeight: 700, fontSize: 14 }}>10 vistas existentes</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH label="Vista" /><TH label="Descripción" /><TH label="Tipo" /><TH label="Flujo real" /><TH label="Archivo backend" /><TH label="Acción" /></tr></thead>
            <tbody>{overview.views.map(v => <SqlObjectRow key={v.name} item={v} actionLabel="Ver resultados" running={runningKey === v.name} onRun={() => runControlled(v.name, v.name, () => adminApi.sqlVista(v.name))} />)}</tbody>
          </table>
        </Card>
      )}

      {section === "funciones" && (
        <Card>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", fontWeight: 700, fontSize: 14 }}>10 funciones SQL: numéricas y de texto</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH label="Función" /><TH label="Descripción" /><TH label="Tipo" /><TH label="Flujo real" /><TH label="Archivo backend" /><TH label="Acción" /></tr></thead>
            <tbody>{overview.functions.map(f => <SqlObjectRow key={f.name} item={f} actionLabel="Ejecutar" running={runningKey === f.name} onRun={() => runControlled(f.name, f.name, () => adminApi.ejecutarFuncionSql(f.name))} />)}</tbody>
          </table>
        </Card>
      )}

      {section === "procedimientos" && (
        <Card>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", fontWeight: 700, fontSize: 14 }}>15 procedimientos almacenados</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH label="Procedimiento" /><TH label="Descripción" /><TH label="Tipo" /><TH label="Flujo real" /><TH label="Archivo backend" /><TH label="Acción" /></tr></thead>
            <tbody>{overview.procedures.map(p => <SqlObjectRow key={p.name} item={p} actionLabel="Ejecutar" running={runningKey === p.name} onRun={() => runControlled(p.name, p.name, () => adminApi.ejecutarProcedimientoSql(p.name))} />)}</tbody>
          </table>
        </Card>
      )}

      {section === "auditoria" && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>10 triggers de auditoría</div>
              <Btn variant="outline" disabled={runningKey === "audit-evidence"} onClick={() => runControlled("audit-evidence", "Auditoría INSERT/UPDATE/DELETE", () => adminApi.auditoriaSqlProbar())}><ShieldCheck size={14} /> Probar auditoría</Btn>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><TH label="Trigger" /><TH label="Tabla" /><TH label="Acción" /><TH label="Flujo real" /><TH label="Endpoint" /><TH label="Archivo backend" /></tr></thead>
              <tbody>{overview.auditTriggers.map(t => <tr key={t.name}><TD mono>{t.name}</TD><TD>{humanizeTechnicalText(t.table)}</TD><TD><Badge label={humanizeAction(t.action ?? "")} variant={STATUS_MAP[t.action ?? ""] ?? "neutral"} /></TD><TD>{t.realUsage}</TD><TD>{t.realEndpoint}</TD><TD>{t.backendFile}</TD></tr>)}</tbody>
            </table>
          </Card>
          <Card>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Auditoría reciente real</div>
              <Btn variant="outline" small onClick={loadRecentAudit}><RefreshCw size={13} /> Actualizar</Btn>
            </div>
            <SqlResultTable rows={recentAudit as unknown as Record<string, unknown>[]} />
          </Card>
        </div>
      )}

      {section === "signal" && (
        <Card>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", fontWeight: 700, fontSize: 14 }}>15 triggers SIGNAL</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH label="Trigger" /><TH label="Descripción" /><TH label="Tipo" /><TH label="Flujo real" /><TH label="Archivo backend" /><TH label="Acción" /></tr></thead>
            <tbody>
              {overview.signalTriggers.map(t => <SqlObjectRow key={t.name} item={{ ...t, category: "escritura" }} actionLabel="Provocar SIGNAL" running={runningKey === t.name} onRun={() => runControlled(t.name, t.name, () => adminApi.probarSignalSql(t.name))} />)}
            </tbody>
          </table>
        </Card>
      )}

      {section === "roles" && (
        <Card>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>3 grupos/roles de MySQL y relación con el aplicativo</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Los roles MySQL existen como evidencia académica; la autorización operativa usa JWT y requireRole en el backend.</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH label="Rol MySQL" /><TH label="Usuario" /><TH label="Permisos" /></tr></thead>
            <tbody>{overview.roles.map(r => <tr key={r.role}><TD mono>{r.role}</TD><TD>{r.user}</TD><TD>{r.permissions.join("; ")}</TD></tr>)}</tbody>
          </table>
        </Card>
      )}

      {result && (
        <Card style={{ marginTop: 16 }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{resultTitle}</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
              {result.message ?? `Parámetros usados: ${(result.params ?? []).join(", ") || "sin parámetros"}`}
              {result.result !== undefined ? ` · Resultado: ${String(result.result ?? "NULL")}` : ""}
            </div>
          </div>
          <SqlResultTable rows={result.rows} />
        </Card>
      )}
    </div>
  );
}

// ─── EMPRESA: Dashboard ───────────────────────────────────────────────────────
function EmpresaDashboard({ setScreen }: { setScreen: (s: Screen) => void }) {
  const dashboard = useApiData(true, empresaApi.dashboard, EMPRESA_DASHBOARD_FALLBACK);
  const profile = dashboard.profile ?? EMPRESA_DASHBOARD_FALLBACK.profile;
  return (
    <div>
      <div style={{ background: "linear-gradient(135deg, #0A2647, #2563EB)", borderRadius: 14, padding: "26px 30px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, marginBottom: 4 }}>Panel de empresa</div>
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 700 }}>{profile?.razon_social ?? "Empresa"}</div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 4 }}>RUC: {profile?.ruc ?? "—"} · Sector {profile?.sector ?? "—"}</div>
        </div>
        <button onClick={() => setScreen("emp-crear-oferta")} style={{ padding: "11px 22px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.28)", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+ Publicar Oferta</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard icon={<Briefcase size={21} />} label="Ofertas Publicadas" value={dashboard.counts.totalOfertas.toLocaleString()} sub={`${dashboard.counts.ofertasCerradas.toLocaleString()} cerradas`} color="#2563EB" />
        <StatCard icon={<CheckCircle size={21} />} label="Ofertas Activas" value={dashboard.counts.ofertasActivas.toLocaleString()} sub="Publicadas y vigentes" color="#10B981" />
        <StatCard icon={<Users size={21} />} label="Postulaciones recibidas" value={dashboard.counts.totalPostulaciones.toLocaleString()} sub={`${dashboard.counts.postulacionesPendientes.toLocaleString()} pendientes de revisión`} color="#F59E0B" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#0F172A", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Mis Ofertas Activas
            <Btn variant="outline" small onClick={() => setScreen("admin-ofertas")}><Eye size={13} /> Ver todas</Btn>
          </div>
          {dashboard.ofertasActivas.slice(0, 4).map((o, i) => (
            <div key={i} style={{ padding: "12px 0", borderBottom: i < 3 ? "1px solid #F1F5F9" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A" }}>{o.titulo}</div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{o.modalidad} · Cierre: {o.fecha_cierre}</div>
              </div>
              <Btn variant="outline" small onClick={() => setScreen("emp-postulaciones")}><Users size={13} /></Btn>
            </div>
          ))}
        </Card>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#0F172A", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Últimas Postulaciones
            <Btn variant="outline" small onClick={() => setScreen("emp-postulaciones")}><Eye size={13} /> Ver todas</Btn>
          </div>
          {dashboard.ultimasPostulaciones.slice(0, 4).map((p, i) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: i < 3 ? "1px solid #F1F5F9" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14, color: "#0F172A" }}>{p.egresado}</div>
                <div style={{ fontSize: 12, color: "#64748B" }}>{p.carrera} · {p.fecha_postulacion.slice(0, 10)}</div>
              </div>
              <StatusBadge label={p.estado_postulacion} />
            </div>
          ))}
        </Card>
      </div>
      <Card style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", marginBottom: 14 }}>Acceso Rápido</div>
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { label: "Publicar Oferta", screen: "emp-crear-oferta" as Screen, icon: <Plus size={16} />, color: "#2563EB" },
            { label: "Revisar Postulaciones", screen: "emp-postulaciones" as Screen, icon: <Users size={16} />, color: "#10B981" },
            { label: "Mis Ofertas", screen: "admin-ofertas" as Screen, icon: <Briefcase size={16} />, color: "#6366F1" },
          ].map(ql => (
            <button key={ql.label} onClick={() => setScreen(ql.screen)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#F8FAFC", cursor: "pointer", fontFamily: "inherit" }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: ql.color + "18", display: "flex", alignItems: "center", justifyContent: "center", color: ql.color }}>{ql.icon}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{ql.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function CrearOferta({ setScreen }: { setScreen: (s: Screen) => void }) {
  const { toast } = useFeedback();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const payload = readOfertaForm(formElement);
    if (!payload) return;

    setSaving(true);
    try {
      await empresaApi.crearOferta({
        ...payload,
        estado_oferta: "Activa",
      });
      formElement.reset();
      toast("success", "Oferta creada correctamente.");
    } catch (error) {
      toast("error", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Crear Oferta Laboral" subtitle="Publica una oferta para egresados." />
      <Card style={{ padding: 32, maxWidth: 820 }}>
        <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <FormField label="Título" required hint="Máximo 150 caracteres."><input name="titulo" style={INP} placeholder="Ej: Software Architect" maxLength={150} /></FormField>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <FormField label="Descripción" required><textarea name="descripcion" style={{ ...INP, height: 100, resize: "vertical" }} placeholder="Descripción del puesto..." /></FormField>
          </div>
          <FormField label="Puesto" required><input name="puesto" style={INP} placeholder="Ej: QA Engineer" /></FormField>
          <FormField label="Área" required>
            <select name="area" style={INP}>
              <option>Seleccionar...</option>
              {["Tecnología", "Finanzas", "Salud", "Industrial", "Educación", "Retail", "Telecomunicaciones", "Logística"].map(a => <option key={a}>{a}</option>)}
            </select>
          </FormField>
          <FormField label="Ubicación" required><input name="ubicacion" style={INP} placeholder="Ej: Huánuco" /></FormField>
          <FormField label="Modalidad" required>
            <select name="modalidad" style={INP}><option>Presencial</option><option>Remoto</option><option>Híbrido</option></select>
          </FormField>
          <FormField label="Tipo de contrato" required>
            <select name="tipo_contrato" style={INP}><option>Indefinido</option><option>Temporal</option><option>Practicante</option></select>
          </FormField>
          <FormField label="Salario" hint="Campo opcional. Dejar vacío si no se desea publicar."><input name="salario" style={INP} type="number" step="0.01" placeholder="Ej: 3500.00" /></FormField>
          <div style={{ gridColumn: "1 / -1" }}>
            <FormField label="Requisitos" hint="Campo opcional."><textarea name="requisitos" style={{ ...INP, height: 80, resize: "vertical" }} placeholder="Ej: Disponibilidad inmediata..." /></FormField>
          </div>
          <FormField label="Fecha de cierre" required hint="La fecha de cierre debe ser posterior a la publicación."><input name="fecha_cierre" style={INP} type="date" /></FormField>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <div style={{ padding: "10px 14px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12, color: "#64748B", width: "100%" }}>
              La fecha de publicación se asignará automáticamente.
            </div>
          </div>
        </div>
        <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid #F1F5F9", display: "flex", gap: 10 }}>
          <button type="submit" disabled={saving} style={{ padding: "11px 26px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{saving ? "Publicando..." : "Publicar Oferta"}</button>
          <Btn variant="outline" onClick={() => setScreen("admin-ofertas")} disabled={saving}>Cancelar</Btn>
        </div>
        </form>
      </Card>
    </div>
  );
}

function PostulacionesRecibidas() {
  const { toast } = useFeedback();
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("Todos");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<EmpresaPostulacion | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const localPostulaciones = (POSTULACIONES as EmpresaPostulacion[]).filter(p => {
    const q = search.toLowerCase();
    return `${p.egresado} ${p.carrera}`.toLowerCase().includes(q) && (estadoFiltro === "Todos" || p.estado_postulacion === estadoFiltro);
  });
  const fallback = paginatedFallback(localPostulaciones, page);
  const postulacionesPage = usePaginatedApiData(
    true,
    () => empresaApi.postulaciones({ page, pageSize: DEFAULT_PAGE_SIZE, search, estado: estadoFiltro }),
    fallback,
    [page, search, estadoFiltro, refreshKey]
  );
  const filtered = postulacionesPage.items;

  useEffect(() => {
    setPage(1);
  }, [search, estadoFiltro]);

  async function handleEstadoPostulacion(id: number, estado: "Aceptado" | "Rechazado" | "Pendiente") {
    try {
      await empresaApi.cambiarEstadoPostulacion(id, estado);
      toast("success", "Estado de postulación actualizado correctamente.");
      setRefreshKey(k => k + 1);
    } catch (error) {
      toast("error", getErrorMessage(error));
    }
  }

  return (
    <div>
      {selected && (
        <DetailModal title={`Postulación #${selected.id_postulacion} — ${selected.egresado}`} onClose={() => setSelected(null)}>
          <DetailSection title="Detalle de postulación">
            <DR label="Egresado" value={selected.egresado} />
            <DR label="Carrera" value={selected.carrera} />
            <DR label="Oferta" value={selected.oferta} />
            <DR label="Fecha de postulación" value={selected.fecha_postulacion} />
            <DR label="Estado" value={selected.estado_postulacion} />
            <DR label="CV adjunto" value={selected.cv_adjunto} />
            <DR label="Observaciones" value={selected.observaciones} full />
          </DetailSection>
        </DetailModal>
      )}
      <PageHeader title="Postulaciones Recibidas" subtitle={`${postulacionesPage.total} postulaciones recibidas`} />
      <Card>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", gap: 10, alignItems: "center" }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por egresado, carrera u oferta..." />
          <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} style={{ padding: "7px 11px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit" }}>
            <option>Todos</option>
            <option>En Proceso</option>
            <option>Pendiente</option>
            <option>Aceptado</option>
            <option>Rechazado</option>
          </select>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><TH label="Egresado" /><TH label="Carrera" /><TH label="Oferta" /><TH label="Fecha" /><TH label="Estado" /><TH label="CV adjunto" /><TH label="Acciones" /></tr></thead>
          <tbody>
            {filtered.length === 0 && <EmptyState />}
            {filtered.map((p, i) => (
              <tr key={i}>
                <TD><div><div style={{ fontWeight: 600 }}>{p.egresado}</div><div style={{ fontSize: 12, color: "#64748B" }}>{p.carrera}</div></div></TD>
                <TD>{p.carrera}</TD>
                <TD>{p.oferta}</TD>
                <TD>{p.fecha_postulacion.slice(0, 10)}</TD>
                <TD><StatusBadge label={p.estado_postulacion} /></TD>
                <TD><span style={{ fontSize: 12, color: "#64748B" }}>{p.cv_adjunto}</span></TD>
                <TD>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Btn variant="outline" small onClick={() => setSelected(p)}><FileText size={13} /> Ver CV</Btn>
                    <button onClick={() => handleEstadoPostulacion(p.id_postulacion, "Pendiente")} style={{ padding: "5px 10px", background: "#EFF6FF", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12, color: "#1E40AF" }}>Pendiente</button>
                    <button onClick={() => handleEstadoPostulacion(p.id_postulacion, "Aceptado")} style={{ padding: "5px 10px", background: "#DCFCE7", border: "none", borderRadius: 7, cursor: "pointer" }}><CheckCircle size={13} color="#166534" /></button>
                    <button onClick={() => handleEstadoPostulacion(p.id_postulacion, "Rechazado")} style={{ padding: "5px 10px", background: "#FEE2E2", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12, color: "#991B1B" }}>✕</button>
                  </div>
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination total={postulacionesPage.total} showing={filtered.length} page={postulacionesPage.page} pageSize={postulacionesPage.pageSize} onPageChange={setPage} />
      </Card>
    </div>
  );
}

function PerfilEmpresa() {
  const { toast } = useFeedback();
  const profile = useApiData(true, empresaApi.perfil, EMPRESAS[0] as AdminEmpresa | null) ?? EMPRESAS[0];
  const [saving, setSaving] = useState(false);
  const [formVersion, setFormVersion] = useState(0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setSaving(true);
    try {
      await empresaApi.actualizarPerfil({
        nombre_comercial: String(form.get("nombre_comercial") ?? ""),
        sector: String(form.get("sector") ?? ""),
        direccion: String(form.get("direccion") ?? ""),
        telefono: String(form.get("telefono") ?? ""),
        correo: String(form.get("correo") ?? ""),
        pagina_web: String(form.get("pagina_web") ?? ""),
      });
      toast("success", "Perfil actualizado correctamente.");
    } catch (error) {
      toast("error", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Perfil de Empresa" subtitle="Datos públicos y de contacto de la empresa." />
      <Card key={`${profile.id_usuario}-${formVersion}`} style={{ padding: 32, maxWidth: 820 }}>
        <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <FormField label="RUC" required hint="11 dígitos."><input style={INP} defaultValue={profile.ruc} maxLength={11} readOnly /></FormField>
          <FormField label="Razón social" required><input style={INP} defaultValue={profile.razon_social} readOnly /></FormField>
          <FormField label="Nombre comercial"><input name="nombre_comercial" style={INP} defaultValue={profile.nombre_comercial ?? ""} /></FormField>
          <FormField label="Sector" required>
            <select name="sector" style={INP} defaultValue={profile.sector}>{["Salud", "Tecnología", "Finanzas", "Industrial", "Retail", "Educación", "Telecomunicaciones", profile.sector].filter((s, i, arr) => arr.indexOf(s) === i).map(s => <option key={s}>{s}</option>)}</select>
          </FormField>
          <div style={{ gridColumn: "1 / -1" }}>
            <FormField label="Dirección" required><input name="direccion" style={INP} defaultValue={profile.direccion} /></FormField>
          </div>
          <FormField label="Teléfono"><input name="telefono" style={INP} defaultValue={profile.telefono ?? ""} maxLength={15} /></FormField>
          <FormField label="Correo">
            <input name="correo" style={INP} type="email" defaultValue={profile.correo} />
          </FormField>
          <div style={{ gridColumn: "1 / -1" }}>
            <FormField label="Página web"><input name="pagina_web" style={INP} defaultValue={profile.pagina_web ?? ""} maxLength={100} /></FormField>
          </div>
        </div>
        <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid #F1F5F9", display: "flex", gap: 10 }}>
          <button type="submit" disabled={saving} style={{ padding: "11px 26px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{saving ? "Guardando..." : "Guardar Cambios"}</button>
          <Btn variant="outline" onClick={() => setFormVersion(version => version + 1)} disabled={saving}>Cancelar</Btn>
        </div>
        </form>
      </Card>
    </div>
  );
}

// ─── EGRESADO: Dashboard ──────────────────────────────────────────────────────
function EgresadoDashboard({ setScreen }: { setScreen: (s: Screen) => void }) {
  const { toast } = useFeedback();
  const dashboard = useApiData(true, egresadoApi.dashboard, EGRESADO_DASHBOARD_FALLBACK);
  const profile = dashboard.profile ?? EGRESADO_PROFILE_FALLBACK;
  const profileItems = [
    { label: "Datos egresado completos", done: true },
    { label: "Correo verificado", done: profile.estado_usuario === "Activo" },
    { label: "Historial laboral registrado", done: dashboard.metrics.historialRegistrado },
    { label: "Encuesta completada", done: dashboard.metrics.encuestaCompletada },
  ];
  const completedProfile = Math.round((profileItems.filter(item => item.done).length / profileItems.length) * 100);

  async function handlePostular(idOferta: number) {
    try {
      await egresadoApi.postular(idOferta);
      toast("success", "Postulación registrada correctamente.");
    } catch (error) {
      toast("error", getErrorMessage(error));
    }
  }

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg, #0A2647, #2563EB)", borderRadius: 14, padding: "28px 30px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, marginBottom: 4 }}>Bienvenido de vuelta,</div>
          <div style={{ color: "#fff", fontSize: 24, fontWeight: 700 }}>{profile.nombre_egresado} {profile.apellidos_egresado}</div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 4 }}>{profile.nombre_carrera} · {profile.nombre_facultad} · Egresado {profile.fecha_egreso} · DNI: {profile.dni}</div>
        </div>
        <button onClick={() => setScreen("egr-bolsa")} style={{ padding: "11px 22px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.28)", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Ver Bolsa Laboral →</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard icon={<FileText size={21} />} label="Mis Postulaciones" value={dashboard.metrics.totalPostulaciones.toLocaleString()} sub={`Estado laboral: ${dashboard.metrics.estadoLaboralActual}`} color="#2563EB" />
        <StatCard icon={<Calendar size={21} />} label="Última Empresa" value={dashboard.metrics.ultimaEmpresa} sub="Según tu historial laboral" color="#6366F1" />
        <StatCard icon={<Briefcase size={21} />} label="Ofertas disponibles" value={dashboard.metrics.ofertasActivas.toLocaleString()} sub="Publicadas y vigentes" color="#10B981" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#0F172A", display: "flex", justifyContent: "space-between" }}>
            Ofertas Recomendadas
            <Btn variant="outline" small onClick={() => setScreen("egr-bolsa")}><Eye size={13} /> Ver todas</Btn>
          </div>
          {dashboard.ofertasRecomendadas.slice(0, 3).map((o, i) => (
            <div key={i} style={{ padding: "14px 0", borderBottom: i < 2 ? "1px solid #F1F5F9" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}><Building2 size={18} color="#2563EB" /></div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A" }}>{o.titulo}</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{o.empresa} · {o.modalidad} · {o.salario != null ? `S/. ${o.salario.toLocaleString()}` : "Sueldo no publicado"}</div>
                </div>
              </div>
              <button onClick={() => handlePostular(o.id_oferta)} style={{ padding: "7px 14px", background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Postular</button>
            </div>
          ))}
        </Card>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#0F172A" }}>Estado de Mi Perfil</div>
          {profileItems.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < 3 ? "1px solid #F8FAFC" : "none" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: item.done ? "#DCFCE7" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {item.done ? <CheckCircle size={14} color="#10B981" /> : <Clock size={14} color="#CBD5E1" />}
              </div>
              <span style={{ fontSize: 13, color: item.done ? "#0F172A" : "#94A3B8" }}>{item.label}</span>
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748B", marginBottom: 6 }}><span>Completado</span><span style={{ fontWeight: 600 }}>{completedProfile}%</span></div>
            <div style={{ background: "#F1F5F9", borderRadius: 999, height: 8 }}><div style={{ width: `${completedProfile}%`, height: 8, background: "#2563EB", borderRadius: 999 }} /></div>
          </div>
          <button onClick={() => setScreen("egr-encuesta")} style={{ width: "100%", marginTop: 16, padding: "10px", background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Completar Encuesta →</button>
        </Card>
      </div>
    </div>
  );
}

// ─── EGRESADO: Bolsa Laboral ──────────────────────────────────────────────────
function BolsaLaboral() {
  const { toast } = useFeedback();
  const [search, setSearch] = useState("");
  const [modalidad, setModalidad] = useState("Todos");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminOferta | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const localOfertas = (OFERTAS as AdminOferta[]).filter(o => {
    const q = search.toLowerCase();
    const match = o.titulo.toLowerCase().includes(q) || o.empresa.toLowerCase().includes(q) || o.area.toLowerCase().includes(q) || o.puesto.toLowerCase().includes(q);
    const mok = modalidad === "Todos" || o.modalidad === modalidad;
    return o.estado_oferta === "Activa" && match && mok;
  });
  const fallback = paginatedFallback(localOfertas, page);
  const ofertasPage = usePaginatedApiData(
    true,
    () => egresadoApi.bolsa({ page, pageSize: DEFAULT_PAGE_SIZE, search, modalidad }),
    fallback,
    [page, search, modalidad, refreshKey]
  );
  const filtered = ofertasPage.items;

  useEffect(() => {
    setPage(1);
  }, [search, modalidad]);

  async function handlePostular(idOferta: number) {
    try {
      await egresadoApi.postular(idOferta);
      toast("success", "Postulación registrada correctamente.");
      setRefreshKey(k => k + 1);
    } catch (error) {
      toast("error", getErrorMessage(error));
    }
  }

  return (
    <div>
      {selected && (
        <DetailModal title={`${selected.titulo} — ${selected.empresa}`} onClose={() => setSelected(null)}>
          <DetailSection title="Datos de la oferta">
            <DR label="Título" value={selected.titulo} />
            <DR label="Puesto" value={selected.puesto} />
            <DR label="Área" value={selected.area} />
            <DR label="Ubicación" value={selected.ubicacion} />
            <DR label="Modalidad" value={selected.modalidad} />
            <DR label="Tipo de contrato" value={selected.tipo_contrato} />
            <DR label="Salario" value={selected.salario != null ? `S/. ${selected.salario.toLocaleString()}` : "—"} />
            <DR label="Fecha de publicación" value={selected.fecha_publicacion} />
            <DR label="Fecha de cierre" value={selected.fecha_cierre} />
            <DR label="Estado" value={selected.estado_oferta} />
            <DR label="Empresa" value={selected.empresa} full />
            <DR label="Descripción" value={selected.descripcion} full />
            <DR label="Requisitos" value={selected.requisitos} full />
          </DetailSection>
        </DetailModal>
      )}
      <PageHeader title="Bolsa Laboral" subtitle={`${ofertasPage.total} ofertas activas disponibles`} />
      <Card style={{ padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
            <input style={{ width: "100%", padding: "9px 12px 9px 36px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} placeholder="Buscar por título, puesto, área o empresa..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["Todos", "Presencial", "Remoto", "Híbrido"].map(m => (
              <button key={m} onClick={() => setModalidad(m)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", borderColor: modalidad === m ? "#2563EB" : "#E2E8F0", background: modalidad === m ? "#EFF6FF" : "#fff", color: modalidad === m ? "#2563EB" : "#64748B" }}>{m}</button>
            ))}
          </div>
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {filtered.length === 0 && (
          <Card style={{ padding: "22px", gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 13, color: "#64748B", textAlign: "center" }}>No se encontraron ofertas.</div>
          </Card>
        )}
        {filtered.map((o, i) => (
          <Card key={i} style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}><Building2 size={22} color="#2563EB" /></div>
              <StatusBadge label={o.estado_oferta} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A", marginBottom: 2 }}>{o.titulo}</div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 4 }}>Puesto: {o.puesto}</div>
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 14 }}>{o.empresa}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {[{ icon: <MapPin size={11} />, label: o.ubicacion }, { icon: <Clock size={11} />, label: o.modalidad }, { icon: <DollarSign size={11} />, label: o.salario != null ? `S/. ${o.salario.toLocaleString()}` : "No publicado" }].map((tag, j) => (
                <span key={j} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", background: "#F8FAFC", borderRadius: 999, fontSize: 12, color: "#64748B", border: "1px solid #E2E8F0" }}>{tag.icon} {tag.label}</span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handlePostular(o.id_oferta)} style={{ flex: 1, padding: "9px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Postular</button>
              <button onClick={() => setSelected(o)} style={{ padding: "9px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, cursor: "pointer" }}><Eye size={14} color="#64748B" /></button>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "#94A3B8" }}>Publicado: {o.fecha_publicacion} · Cierre: {o.fecha_cierre}</div>
          </Card>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <Pagination total={ofertasPage.total} showing={filtered.length} page={ofertasPage.page} pageSize={ofertasPage.pageSize} onPageChange={setPage} />
      </div>
    </div>
  );
}

// ─── EGRESADO: Mis Postulaciones ──────────────────────────────────────────────
function MisPostulaciones() {
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("Todos");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<EgresadoPostulacion | null>(null);
  const localPostulaciones = (POSTULACIONES as EgresadoPostulacion[]).slice(0, 3).filter(p => {
    const q = search.toLowerCase();
    return `${p.oferta} ${p.empresa} ${p.observaciones ?? ""}`.toLowerCase().includes(q) && (estadoFiltro === "Todos" || p.estado_postulacion === estadoFiltro);
  });
  const fallback = paginatedFallback(localPostulaciones, page);
  const postulacionesPage = usePaginatedApiData(
    true,
    () => egresadoApi.postulaciones({ page, pageSize: DEFAULT_PAGE_SIZE, search, estado: estadoFiltro }),
    fallback,
    [page, search, estadoFiltro]
  );
  const filtered = postulacionesPage.items;

  useEffect(() => {
    setPage(1);
  }, [search, estadoFiltro]);

  return (
    <div>
      {selected && (
        <DetailModal title={`Postulación #${selected.id_postulacion} — ${selected.oferta}`} onClose={() => setSelected(null)}>
          <DetailSection title="Detalle de postulación">
            <DR label="Oferta" value={selected.oferta} />
            <DR label="Empresa" value={selected.empresa} />
            <DR label="Fecha de postulación" value={selected.fecha_postulacion} />
            <DR label="Estado" value={selected.estado_postulacion} />
            <DR label="CV adjunto" value={selected.cv_adjunto} />
            <DR label="Observaciones" value={selected.observaciones} full />
          </DetailSection>
        </DetailModal>
      )}
      <PageHeader title="Mis Postulaciones" subtitle={`${postulacionesPage.total} postulaciones registradas`} />
      <Card>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", gap: 10 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por oferta, empresa u observaciones..." />
          <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} style={{ padding: "7px 11px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit" }}>
            <option>Todos</option>
            <option>En Proceso</option>
            <option>Pendiente</option>
            <option>Aceptado</option>
            <option>Rechazado</option>
          </select>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><TH label="Oferta" /><TH label="Empresa" /><TH label="Fecha" /><TH label="Estado" /><TH label="CV adjunto" /><TH label="Acciones" /></tr></thead>
          <tbody>
            {filtered.length === 0 && <EmptyState />}
            {filtered.map((p, i) => (
              <tr key={i}>
                <TD><div><div style={{ fontWeight: 600 }}>{p.oferta}</div><div style={{ fontSize: 12, color: "#64748B" }}>{p.observaciones}</div></div></TD>
                <TD>{p.empresa}</TD>
                <TD>{p.fecha_postulacion.slice(0, 10)}</TD>
                <TD><StatusBadge label={p.estado_postulacion} /></TD>
                <TD><span style={{ fontSize: 12, color: "#2563EB" }}>{p.cv_adjunto}</span></TD>
                <TD><Btn variant="ghost" small onClick={() => setSelected(p)}><Eye size={14} /> Ver detalle</Btn></TD>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination total={postulacionesPage.total} showing={filtered.length} page={postulacionesPage.page} pageSize={postulacionesPage.pageSize} onPageChange={setPage} />
      </Card>
    </div>
  );
}

function MiPerfil() {
  const { toast } = useFeedback();
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const loadProfile = useCallback(() => {
    void refreshKey;
    return egresadoApi.perfil();
  }, [refreshKey]);
  const loadCarreras = useCallback(() => egresadoApi.carreras(), []);
  const profile = useApiData(true, loadProfile, EGRESADO_PROFILE_FALLBACK) ?? EGRESADO_PROFILE_FALLBACK;
  const carreras = useApiData<CarreraItem[]>(true, loadCarreras, []);
  const initials = `${profile.nombre_egresado[0] ?? ""}${profile.apellidos_egresado[0] ?? ""}`.toUpperCase();
  const facultades = Array.from(new Set(carreras.map(c => c.nombre_facultad).concat(FACULTADES, profile.nombre_facultad)));
  const carrerasDisponibles = carreras.length > 0
    ? carreras
    : [{ id_carrera: profile.id_carrera ?? 0, nombre_carrera: profile.nombre_carrera, grado_academico: profile.grado_academico, id_facultad: profile.id_facultad ?? 0, nombre_facultad: profile.nombre_facultad }];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setSaving(true);
    try {
      await egresadoApi.actualizarPerfil({
        dni: String(form.get("dni") ?? ""),
        sexo: String(form.get("sexo") ?? ""),
        nombre_egresado: String(form.get("nombre_egresado") ?? ""),
        apellidos_egresado: String(form.get("apellidos_egresado") ?? ""),
        telefono: String(form.get("telefono") ?? ""),
        fecha_egreso: String(form.get("fecha_egreso") ?? ""),
        direccion: String(form.get("direccion") ?? ""),
        nombre_carrera: String(form.get("nombre_carrera") ?? ""),
        correo: String(form.get("correo") ?? ""),
      });
      toast("success", "Perfil actualizado correctamente.");
      setRefreshKey(k => k + 1);
    } catch (error) {
      toast("error", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Mi Perfil" subtitle="Datos personales, académicos y de contacto." />
      <Card key={`${profile.id_usuario}-${formVersion}`} style={{ padding: 32, maxWidth: 820 }}>
        <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ width: 100, height: 100, borderRadius: 16, background: "linear-gradient(135deg, #2563EB, #6366F1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{initials}</div>
            <button type="button" onClick={unavailableCrudAction} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "1px solid #D1D5DB", borderRadius: 8, background: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", color: "#374151" }}><Upload size={13} /> Foto (visual)</button>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#0F172A" }}>{profile.nombre_egresado} {profile.apellidos_egresado}</div>
            <div style={{ fontSize: 14, color: "#64748B", marginTop: 3 }}>{profile.nombre_carrera} · {profile.nombre_facultad} · {profile.grado_academico}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Badge label={`Estado: ${profile.estado_usuario}`} variant={profile.estado_usuario === "Activo" ? "success" : "neutral"} />
              <Badge label={`Sexo: ${profile.sexo}`} variant="info" />
            </div>
          </div>
        </div>

        <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 14 }}>Datos personales</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 28 }}>
          <FormField label="DNI" required hint="8 dígitos."><input name="dni" style={INP} defaultValue={profile.dni} maxLength={8} /></FormField>
          <FormField label="Sexo" required hint="M = Masculino, F = Femenino">
            <select name="sexo" style={INP} defaultValue={profile.sexo}>
              <option value="M">Masculino (M)</option>
              <option value="F">Femenino (F)</option>
            </select>
          </FormField>
          <FormField label="Nombres" required><input name="nombre_egresado" style={INP} defaultValue={profile.nombre_egresado} /></FormField>
          <FormField label="Apellidos" required><input name="apellidos_egresado" style={INP} defaultValue={profile.apellidos_egresado} /></FormField>
          <FormField label="Teléfono"><input name="telefono" style={INP} defaultValue={profile.telefono ?? ""} maxLength={15} /></FormField>
          <FormField label="Fecha de egreso" required><input name="fecha_egreso" style={INP} type="date" defaultValue={profile.fecha_egreso} /></FormField>
          <div style={{ gridColumn: "1 / -1" }}>
            <FormField label="Dirección"><input name="direccion" style={INP} defaultValue={profile.direccion ?? ""} /></FormField>
          </div>
        </div>

        <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 14 }}>Datos académicos</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 28 }}>
          <FormField label="Facultad">
            <select style={INP} defaultValue={profile.nombre_facultad}>{facultades.map(f => <option key={f}>{f}</option>)}</select>
          </FormField>
          <FormField label="Carrera" required>
            <select name="nombre_carrera" style={INP} defaultValue={profile.nombre_carrera}>{carrerasDisponibles.map(c => <option key={`${c.id_carrera}-${c.nombre_carrera}`} value={c.nombre_carrera}>{c.nombre_carrera}</option>)}</select>
          </FormField>
        </div>

        <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 14 }}>Cuenta de acceso</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <FormField label="Usuario" hint="No puede modificarse.">
            <input style={{ ...INP, background: "#F8FAFC", color: "#64748B" }} defaultValue={profile.nombre_usuario} readOnly />
          </FormField>
          <FormField label="Correo" required><input name="correo" style={INP} type="email" defaultValue={profile.correo} /></FormField>
        </div>

        <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid #F1F5F9", display: "flex", gap: 10 }}>
          <button type="submit" disabled={saving} style={{ padding: "11px 26px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.65 : 1 }}>{saving ? "Actualizando..." : "Actualizar Perfil"}</button>
          <Btn variant="outline" onClick={() => setFormVersion(version => version + 1)} disabled={saving}>Cancelar</Btn>
        </div>
        </form>
      </Card>
    </div>
  );
}

function HistorialLaboral() {
  const { toast, requestConfirmation } = useFeedback();
  const [search, setSearch] = useState("");
  const [actualFiltro, setActualFiltro] = useState("Todos");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HistorialLaboralItem | null>(null);
  const [actualFlag, setActualFlag] = useState(false);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const fallback = paginatedFallback(HISTORIAL_LABORAL as HistorialLaboralItem[], page);
  const historialPage = usePaginatedApiData(
    true,
    () => egresadoApi.historial({ page, pageSize: DEFAULT_PAGE_SIZE, search, actual: actualFiltro }),
    fallback,
    [page, search, actualFiltro, refreshKey]
  );
  const historialItems = historialPage.items;

  useEffect(() => {
    setPage(1);
  }, [search, actualFiltro]);

  function openCreateForm() {
    setEditing(null);
    setActualFlag(false);
    setShowForm(true);
  }

  function openEditForm(item: HistorialLaboralItem) {
    setEditing(item);
    setActualFlag(item.actual === true || item.actual === 1);
    setShowForm(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      nombre_empresa: String(form.get("nombre_empresa") ?? ""),
      cargo: String(form.get("cargo") ?? ""),
      fecha_inicio: String(form.get("fecha_inicio") ?? ""),
      fecha_fin: actualFlag ? null : String(form.get("fecha_fin") ?? ""),
      salario: String(form.get("salario") ?? ""),
      modalidad: String(form.get("modalidad") ?? ""),
      actual: actualFlag,
    };

    setSaving(true);
    try {
      if (editing) {
        await egresadoApi.actualizarHistorial(editing.id_historial, payload);
        toast("success", "Historial laboral actualizado correctamente.");
      } else {
        await egresadoApi.crearHistorial(payload);
        toast("success", "Historial laboral registrado correctamente.");
      }
      setShowForm(false);
      setEditing(null);
      setActualFlag(false);
      setRefreshKey(k => k + 1);
    } catch (error) {
      toast("error", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: HistorialLaboralItem) {
    const confirmed = await requestConfirmation({
      title: "Eliminar historial laboral",
      message: `¿Deseas eliminar la experiencia en "${item.nombre_empresa}"?`,
      confirmLabel: "Eliminar",
      variant: "danger",
    });
    if (!confirmed) {
      toast("info", "Operación cancelada.");
      return;
    }

    try {
      await egresadoApi.eliminarHistorial(item.id_historial);
      toast("success", "Historial laboral eliminado correctamente.");
      setRefreshKey(k => k + 1);
    } catch (error) {
      toast("error", getErrorMessage(error));
    }
  }

  return (
    <div>
      <PageHeader title="Historial Laboral" subtitle={`${historialPage.total} experiencias registradas`} action={<Btn onClick={openCreateForm}><Plus size={14} /> Agregar Experiencia</Btn>} />

      {showForm && (
        <Card style={{ padding: 28, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 18 }}>{editing ? "Editar Experiencia" : "Nueva Experiencia"}</div>
          <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <FormField label="Empresa" required><input name="nombre_empresa" style={INP} placeholder="Ej: Talleres Castellana S.A.D" defaultValue={editing?.nombre_empresa ?? ""} /></FormField>
            <FormField label="Cargo" required><input name="cargo" style={INP} placeholder="Ej: Cloud Engineer" defaultValue={editing?.cargo ?? ""} /></FormField>
            <FormField label="Fecha de inicio" required><input name="fecha_inicio" style={INP} type="date" defaultValue={editing?.fecha_inicio ?? ""} /></FormField>
            <FormField label="Fecha de fin" hint={actualFlag ? "No se registra fecha de fin para el trabajo actual." : "Dejar vacío si aún labora ahí."}>
              <input name="fecha_fin" style={INP} type="date" disabled={actualFlag} defaultValue={editing?.fecha_fin ?? ""} />
            </FormField>
            <FormField label="Modalidad" required>
              <select name="modalidad" style={INP} defaultValue={editing?.modalidad ?? "Presencial"}><option>Presencial</option><option>Remoto</option><option>Híbrido</option></select>
            </FormField>
            <FormField label="Salario" hint="Campo opcional."><input name="salario" style={INP} type="number" step="0.01" placeholder="Ej: 3500.00" defaultValue={editing?.salario ?? ""} /></FormField>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={actualFlag} onChange={e => setActualFlag(e.target.checked)} style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Trabajo actual</span>
              </label>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4, marginLeft: 26 }}>Si marcas esta opción, la fecha de fin queda vacía.</div>
            </div>
          </div>
          <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
            <button type="submit" disabled={saving} style={{ padding: "10px 22px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.65 : 1 }}>{saving ? "Guardando..." : "Guardar Experiencia"}</button>
            <Btn variant="outline" onClick={() => { setShowForm(false); setEditing(null); setActualFlag(false); }}>Cancelar</Btn>
          </div>
          </form>
        </Card>
      )}

      <Card>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", gap: 10, alignItems: "center" }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por empresa, cargo o modalidad..." />
          <select value={actualFiltro} onChange={e => setActualFiltro(e.target.value)} style={{ padding: "7px 11px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit" }}>
            <option>Todos</option>
            <option value="true">Actual</option>
            <option value="false">No actual</option>
          </select>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><TH label="Empresa" /><TH label="Cargo" /><TH label="Inicio" /><TH label="Fin" /><TH label="Modalidad" /><TH label="Salario" /><TH label="Actual" /><TH label="Acciones" /></tr></thead>
          <tbody>
            {historialItems.length === 0 && <EmptyState />}
            {historialItems.map((h, i) => (
              <tr key={i}>
                <TD><span style={{ fontWeight: 600 }}>{h.nombre_empresa}</span></TD>
                <TD>{h.cargo}</TD>
                <TD>{h.fecha_inicio}</TD>
                <TD>{h.actual ? <Badge label="En curso" variant="success" /> : h.fecha_fin}</TD>
                <TD><span style={{ padding: "3px 10px", background: "#F1F5F9", borderRadius: 6, fontSize: 12 }}>{h.modalidad}</span></TD>
                <TD><span style={{ fontWeight: 600, color: "#10B981" }}>{h.salario != null ? `S/. ${h.salario.toLocaleString()}` : "—"}</span></TD>
                <TD><Badge label={h.actual ? "Sí" : "No"} variant={h.actual ? "success" : "neutral"} /></TD>
                <TD>
                  <div style={{ display: "flex", gap: 2 }}>
                    <Btn variant="ghost" small onClick={() => openEditForm(h)}><Edit2 size={14} /></Btn>
                    <Btn variant="danger" small onClick={() => handleDelete(h)}><Trash2 size={14} /></Btn>
                  </div>
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination total={historialPage.total} showing={historialItems.length} page={historialPage.page} pageSize={historialPage.pageSize} onPageChange={setPage} />
      </Card>
    </div>
  );
}

function EncuestaSeguimiento({ onNotificationsChanged }: { onNotificationsChanged?: () => void }) {
  const { toast } = useFeedback();
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [notifiedAvailabilityKey, setNotifiedAvailabilityKey] = useState<string | null>(null);
  const loadEncuesta = useCallback(() => {
    void refreshKey;
    return egresadoApi.encuesta();
  }, [refreshKey]);
  const encuesta = useApiData<EgresadoEncuesta | null>(true, loadEncuesta, null);
  const lastSurveyDate = encuesta?.fecha_registro ?? "Sin encuesta";
  const nextSurveyDate = encuesta?.proxima_disponible ?? "Disponible";
  const canSubmit = encuesta == null || encuesta.can_submit === true || encuesta.can_submit === 1;

  useEffect(() => {
    const availabilityKey = encuesta?.proxima_disponible ?? null;
    if (encuesta && canSubmit && availabilityKey && notifiedAvailabilityKey !== availabilityKey) {
      onNotificationsChanged?.();
      setNotifiedAvailabilityKey(availabilityKey);
    }
  }, [canSubmit, encuesta, notifiedAvailabilityKey]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setSaving(true);
    try {
      await egresadoApi.crearEncuesta({
        estado_laboral: String(form.get("estado_laboral") ?? ""),
        nombre_empresa_actual: String(form.get("nombre_empresa_actual") ?? ""),
        cargo_actual: String(form.get("cargo_actual") ?? ""),
        area_trabajo: String(form.get("area_trabajo") ?? ""),
        sueldo_mensual: String(form.get("sueldo_mensual") ?? ""),
        tipo_contrato: String(form.get("tipo_contrato") ?? ""),
        satisfaccion_profesional: String(form.get("satisfaccion_profesional") ?? ""),
        tiempo_conseguir_empleo: String(form.get("tiempo_conseguir_empleo") ?? ""),
        observaciones: String(form.get("observaciones") ?? ""),
      });
      toast("success", "Encuesta registrada correctamente.");
      setRefreshKey(k => k + 1);
    } catch (error) {
      toast("error", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Encuesta de Seguimiento Laboral" subtitle="Actualiza tu situación laboral cuando esté disponible." />

      <Card style={{ padding: 20, marginBottom: 20, border: "1px solid #FEF3C7" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Clock size={20} color="#92400E" /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#92400E", marginBottom: 10 }}>{canSubmit ? "Encuesta disponible" : "Encuesta no disponible aún"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Última encuesta</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>{lastSurveyDate}</div>
              </div>
              <div style={{ background: "#FEF3C7", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#92400E", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Próxima disponible</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#92400E" }}>{nextSurveyDate}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Info size={14} color="#64748B" style={{ marginTop: 1, flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: "#64748B", margin: 0, lineHeight: 1.6 }}>
                Las encuestas de seguimiento laboral se habilitan según la periodicidad configurada por el administrador.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card style={{ padding: 32, maxWidth: 760 }}>
        <form onSubmit={handleSubmit}>
        <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "14px 18px", marginBottom: 28, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <AlertCircle size={17} color="#2563EB" style={{ marginTop: 1, flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: "#1E40AF", margin: 0, lineHeight: 1.65 }}>
            Tu información es confidencial y se usará para el seguimiento académico y laboral.
          </p>
        </div>

        <fieldset disabled={!canSubmit} style={{ border: "none", padding: 0, margin: 0, opacity: canSubmit ? 1 : 0.55 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Estado laboral <span style={{ color: "#EF4444" }}>*</span></label>
              <select name="estado_laboral" style={INP} defaultValue={encuesta?.estado_laboral ?? "Seleccionar..."}>
                <option>Seleccionar...</option>
                <option>Empleado</option>
                <option>Independiente</option>
                <option>Desempleado</option>
                <option>Estudiando</option>
                <option>Emprendedor</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Empresa actual</label>
              <input name="nombre_empresa_actual" style={INP} placeholder="Dejar vacío si no aplica" defaultValue={encuesta?.nombre_empresa_actual ?? ""} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Cargo actual</label>
              <input name="cargo_actual" style={INP} placeholder="Cargo o puesto actual" defaultValue={encuesta?.cargo_actual ?? ""} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Área de trabajo</label>
              <input name="area_trabajo" style={INP} placeholder="Ej: Logística, Salud, Tecnología..." defaultValue={encuesta?.area_trabajo ?? ""} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Sueldo mensual</label>
              <input name="sueldo_mensual" style={INP} type="number" step="0.01" placeholder="Ej: 3500.00" defaultValue={encuesta?.sueldo_mensual ?? ""} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Tipo de contrato</label>
              <select name="tipo_contrato" style={INP} defaultValue={encuesta?.tipo_contrato ?? "Seleccionar..."}>
                <option>Seleccionar...</option>
                <option>Indefinido</option>
                <option>Temporal</option>
                <option>Practicante</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Satisfacción profesional</label>
              <select name="satisfaccion_profesional" style={INP} defaultValue={encuesta?.satisfaccion_profesional ?? "Seleccionar..."}>
                <option>Seleccionar...</option>
                <option>Muy Satisfecho</option>
                <option>Satisfecho</option>
                <option>Regular</option>
                <option>Insatisfecho</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Tiempo para conseguir empleo</label>
              <select name="tiempo_conseguir_empleo" style={INP} defaultValue={encuesta?.tiempo_conseguir_empleo ?? "Seleccionar..."}>
                <option>Seleccionar...</option>
                <option>1 mes</option>
                <option>3 meses</option>
                <option>6 meses</option>
                <option>1 año</option>
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Observaciones</label>
              <textarea name="observaciones" style={{ ...INP, height: 90, resize: "vertical" }} placeholder="Observaciones opcionales..." defaultValue={encuesta?.observaciones ?? ""} />
            </div>
          </div>
        </fieldset>

        <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid #F1F5F9", display: "flex", gap: 10, alignItems: "center" }}>
          <button type="submit" disabled={!canSubmit || saving} style={{ padding: "9px 18px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: !canSubmit || saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: !canSubmit || saving ? 0.5 : 1 }}>{saving ? "Enviando..." : "Enviar Encuesta"}</button>
          {!canSubmit && (
            <span style={{ fontSize: 12, color: "#94A3B8", display: "flex", alignItems: "center", gap: 5 }}>
              <Clock size={13} /> Disponible a partir del {nextSurveyDate}
            </span>
          )}
        </div>
        </form>
      </Card>
    </div>
  );
}

function Notificaciones({ useApi = false, canManage = false, unreadTotal, onNotificationsChanged }: { useApi?: boolean; canManage?: boolean; unreadTotal?: number; onNotificationsChanged?: () => void }) {
  const { toast, requestConfirmation } = useFeedback();
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("Todas");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const isLeida = (value: ApiNotificacion["leido"]) => value === true || value === 1 || String(value) === "1";
  const localNotificaciones = (NOTIFICACIONES_DATA as ApiNotificacion[]).filter(n => {
    const q = search.toLowerCase();
    const leida = isLeida(n.leido);
    return `${n.titulo} ${n.mensaje}`.toLowerCase().includes(q) && (estadoFiltro === "Todas" || (estadoFiltro === "Leídas" ? leida : !leida));
  });
  const fallback = useApi
    ? { items: [], total: 0, page, pageSize: DEFAULT_PAGE_SIZE }
    : paginatedFallback(localNotificaciones, page);
  const notifsPage = usePaginatedApiData(
    useApi,
    () => adminApi.notificaciones({ page, pageSize: DEFAULT_PAGE_SIZE, search, estado: estadoFiltro }),
    fallback,
    [useApi, page, search, estadoFiltro, refreshKey]
  );
  const apiNotifs = useApi ? notifsPage.items : fallback.items;
  const [notifs, setNotifs] = useState<ApiNotificacion[]>(apiNotifs);

  useEffect(() => {
    setNotifs(apiNotifs);
  }, [apiNotifs]);

  useEffect(() => {
    setPage(1);
  }, [search, estadoFiltro]);

  async function markRead(id: number) {
    if (useApi) {
      try {
        await adminApi.marcarNotificacionLeida(id);
        toast("success", "Notificación marcada como leída.");
        setRefreshKey(k => k + 1);
        onNotificationsChanged?.();
      } catch (error) {
        toast("error", getErrorMessage(error));
      }
      return;
    }

    setNotifs(prev => prev.map(n => n.id_notificacion === id ? { ...n, leido: true } : n));
  }

  async function markAllRead() {
    if (useApi) {
      try {
        await adminApi.marcarTodasNotificacionesLeidas();
        toast("success", "Todas las notificaciones fueron marcadas como leídas.");
        setRefreshKey(k => k + 1);
        onNotificationsChanged?.();
      } catch (error) {
        toast("error", getErrorMessage(error));
      }
      return;
    }

    setNotifs(prev => prev.map(n => ({ ...n, leido: true })));
  }

  async function handleCreateNotificacion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const titulo = String(form.get("titulo") ?? "").trim();
    const mensaje = String(form.get("mensaje") ?? "").trim();
    if (!titulo || !mensaje) {
      toast("warning", "Título y mensaje son obligatorios.");
      return;
    }

    setSavingCreate(true);
    try {
      await adminApi.crearNotificacion({ titulo, mensaje });
      toast("success", "Notificación creada correctamente.");
      setCreating(false);
      setRefreshKey(k => k + 1);
      onNotificationsChanged?.();
    } catch (error) {
      toast("error", getErrorMessage(error));
    } finally {
      setSavingCreate(false);
    }
  }

  async function handleDeleteNotificacion(item: ApiNotificacion) {
    const confirmed = await requestConfirmation({
      title: "Eliminar notificación",
      message: `¿Deseas eliminar la notificación "${item.titulo}"?`,
      confirmLabel: "Eliminar",
      variant: "danger",
    });
    if (!confirmed) {
      toast("info", "Operación cancelada.");
      return;
    }

    try {
      await adminApi.eliminarNotificacion(item.id_notificacion);
      toast("success", "Notificación eliminada correctamente.");
      setRefreshKey(k => k + 1);
      onNotificationsChanged?.();
    } catch (error) {
      toast("error", getErrorMessage(error));
    }
  }

  const unread = useApi ? (unreadTotal ?? 0) : notifs.filter(n => !isLeida(n.leido)).length;

  return (
    <div>
      {creating && (
        <DetailModal title="Crear Notificación" onClose={() => setCreating(false)}>
          <form onSubmit={handleCreateNotificacion}>
            <div style={{ display: "grid", gap: 18 }}>
              <FormField label="Título" required hint="Máximo 150 caracteres."><input name="titulo" style={INP} maxLength={150} required /></FormField>
              <FormField label="Mensaje" required><textarea name="mensaje" style={{ ...INP, height: 120, resize: "vertical" }} required /></FormField>
            </div>
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #F1F5F9", display: "flex", gap: 10 }}>
              <button type="submit" disabled={savingCreate} style={{ padding: "11px 26px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: savingCreate ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: savingCreate ? 0.65 : 1 }}>{savingCreate ? "Guardando..." : "Crear notificación"}</button>
              <Btn variant="outline" onClick={() => setCreating(false)} disabled={savingCreate}>Cancelar</Btn>
            </div>
          </form>
        </DetailModal>
      )}
      <PageHeader
        title="Notificaciones"
        subtitle={`${unread} sin leer`}
        action={<div style={{ display: "flex", gap: 8 }}>{canManage && <Btn onClick={() => setCreating(true)}><Plus size={14} /> Crear Notificación</Btn>}<Btn variant="outline" onClick={markAllRead}><CheckCircle size={14} /> Marcar todas leídas</Btn></div>}
      />
      <Card style={{ maxWidth: 760, marginBottom: 12 }}>
        <div style={{ padding: "14px 18px", display: "flex", gap: 10, alignItems: "center" }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por título o mensaje..." />
          <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} style={{ padding: "7px 11px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit" }}>
            <option>Todas</option><option>Leídas</option><option>No leídas</option>
          </select>
        </div>
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 760 }}>
        {notifs.length === 0 && (
          <Card style={{ padding: "18px 22px" }}>
            <div style={{ fontSize: 13, color: "#64748B" }}>No hay notificaciones para mostrar.</div>
          </Card>
        )}
        {notifs.map((n) => {
          const leida = isLeida(n.leido);
          return (
          <Card key={n.id_notificacion} style={{ padding: "18px 22px", borderLeft: `4px solid ${leida ? "#E2E8F0" : "#2563EB"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{n.titulo}</div>
                  <Badge label={leida ? "Leída" : "No leída"} variant={leida ? "neutral" : "info"} />
                </div>
                <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.65, marginBottom: 8 }}>{n.mensaje}</div>
                <div style={{ fontSize: 11, color: "#94A3B8", display: "flex", alignItems: "center", gap: 6 }}>
                  <Clock size={11} /> {n.fecha_envio}
                </div>
              </div>
              {!leida && (
                <button onClick={() => markRead(n.id_notificacion)} style={{ padding: "6px 12px", border: "1px solid #E2E8F0", borderRadius: 8, background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: "#374151", whiteSpace: "nowrap" }}>
                  Marcar leída
                </button>
              )}
              {canManage && (
                <button onClick={() => handleDeleteNotificacion(n)} style={{ padding: "6px 10px", border: "none", borderRadius: 8, background: "#FEE2E2", fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: "#991B1B", whiteSpace: "nowrap" }}>
                  Eliminar
                </button>
              )}
            </div>
          </Card>
        )})}
      </div>
      <div style={{ maxWidth: 760, marginTop: 12 }}>
        <Pagination total={useApi ? notifsPage.total : localNotificaciones.length} showing={notifs.length} page={useApi ? notifsPage.page : page} pageSize={useApi ? notifsPage.pageSize : DEFAULT_PAGE_SIZE} onPageChange={setPage} />
      </div>
    </div>
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────
type MenuItem = { label: string; screen: Screen; icon: React.ReactNode };

const MENUS: Record<Role, MenuItem[]> = {
  admin: [
    { label: "Dashboard", screen: "admin-dashboard", icon: <LayoutDashboard size={17} /> },
    { label: "Egresados", screen: "admin-egresados", icon: <GraduationCap size={17} /> },
    { label: "Empresas", screen: "admin-empresas", icon: <Building2 size={17} /> },
    { label: "Ofertas Laborales", screen: "admin-ofertas", icon: <Briefcase size={17} /> },
    { label: "Encuestas", screen: "admin-encuestas", icon: <ClipboardList size={17} /> },
    { label: "Reportes", screen: "admin-reportes", icon: <BarChart2 size={17} /> },
    { label: "Auditoría", screen: "admin-auditoria", icon: <ShieldCheck size={17} /> },
    { label: "Evidencias SQL", screen: "admin-sql-evidencias", icon: <FileText size={17} /> },
    { label: "Configuración", screen: "admin-config", icon: <Settings size={17} /> },
    { label: "Notificaciones", screen: "notificaciones", icon: <Bell size={17} /> },
  ],
  empresa: [
    { label: "Dashboard", screen: "emp-dashboard", icon: <LayoutDashboard size={17} /> },
    { label: "Mis Ofertas", screen: "admin-ofertas", icon: <Briefcase size={17} /> },
    { label: "Postulaciones", screen: "emp-postulaciones", icon: <Users size={17} /> },
    { label: "Crear Oferta", screen: "emp-crear-oferta", icon: <Plus size={17} /> },
    { label: "Perfil Empresa", screen: "emp-perfil", icon: <Building2 size={17} /> },
    { label: "Notificaciones", screen: "notificaciones", icon: <Bell size={17} /> },
  ],
  egresado: [
    { label: "Mi Dashboard", screen: "egr-dashboard", icon: <LayoutDashboard size={17} /> },
    { label: "Mi Perfil", screen: "egr-perfil", icon: <User size={17} /> },
    { label: "Bolsa Laboral", screen: "egr-bolsa", icon: <Briefcase size={17} /> },
    { label: "Mis Postulaciones", screen: "egr-postulaciones", icon: <FileText size={17} /> },
    { label: "Historial Laboral", screen: "egr-historial", icon: <Calendar size={17} /> },
    { label: "Encuesta", screen: "egr-encuesta", icon: <ClipboardList size={17} /> },
    { label: "Notificaciones", screen: "notificaciones", icon: <Bell size={17} /> },
  ],
};

function Sidebar({ session, role, screen, setScreen, onLogout, unreadCount }: { session: AuthSession; role: Role; screen: Screen; setScreen: (s: Screen) => void; onLogout: () => void; unreadCount: number }) {
  const roleLabel: Record<Role, string> = { admin: "Administrador", empresa: "Empresa", egresado: "Egresado" };
  const roleColor: Record<Role, string> = { admin: "#2563EB", empresa: "#10B981", egresado: "#6366F1" };
  const avatar = sessionInitials(session);
  const userName = displaySessionName(session);

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: 240, height: "100vh", background: "#0A2647", display: "flex", flexDirection: "column", zIndex: 100 }}>
      <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><GraduationCap size={20} color="#fff" /></div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 12, lineHeight: 1.2 }}>Universidad de Huánuco</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>UDH · Egresados</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: roleColor[role] + "22", borderRadius: 999 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: roleColor[role], flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{roleLabel[role]}</span>
        </div>
      </div>
      <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 8px 8px" }}>MENÚ</div>
        {MENUS[role].map((item) => {
          const active = screen === item.screen;
          const isNotif = item.screen === "notificaciones";
          return (
            <button key={item.screen + item.label} onClick={() => setScreen(item.screen)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left", fontSize: 13, fontWeight: active ? 600 : 400, marginBottom: 1, fontFamily: "inherit", background: active ? "rgba(37,99,235,0.3)" : "transparent", color: active ? "#fff" : "rgba(255,255,255,0.58)", borderLeft: `3px solid ${active ? "#2563EB" : "transparent"}` }}>
              <span style={{ opacity: active ? 1 : 0.65, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {isNotif && unreadCount > 0 && (
                <span style={{ background: "#EF4444", color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, padding: "1px 7px", minWidth: 18, textAlign: "center" }}>{unreadCount}</span>
              )}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: "14px 12px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{avatar}</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{userName}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.38)" }}>{roleLabel[role]}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)", fontSize: 12, fontFamily: "inherit" }}>
          <LogOut size={14} /> Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

const SCREEN_TITLES: Partial<Record<Screen, string>> = {
  "admin-dashboard": "Dashboard", "admin-egresados": "Gestión de Egresados",
  "admin-empresas": "Gestión de Empresas", "admin-ofertas": "Gestión de Ofertas Laborales",
  "admin-encuestas": "Gestión de Encuestas", "admin-reportes": "Reportes y Estadísticas",
  "admin-config": "Configuración del Sistema", "admin-auditoria": "Auditoría del Sistema",
  "admin-sql-evidencias": "Evidencias SQL",
  "emp-dashboard": "Panel de Empresa", "emp-crear-oferta": "Crear Oferta Laboral",
  "emp-postulaciones": "Postulaciones Recibidas", "emp-perfil": "Perfil de Empresa",
  "egr-dashboard": "Mi Dashboard", "egr-bolsa": "Bolsa Laboral",
  "egr-postulaciones": "Mis Postulaciones", "egr-encuesta": "Encuesta de Seguimiento",
  "egr-perfil": "Mi Perfil", "egr-historial": "Historial Laboral",
  "notificaciones": "Notificaciones",
};

function screenTitleForRole(role: Role, screen: Screen) {
  if (role === "empresa" && screen === "admin-ofertas") return "Mis Ofertas";
  return SCREEN_TITLES[screen] ?? screen;
}

function TopNav({ session, role, screen, setScreen, unreadCount }: { session: AuthSession; role: Role; screen: Screen; setScreen: (s: Screen) => void; unreadCount: number }) {
  const userName = displaySessionName(session);
  const avatar = sessionInitials(session);
  const roles: Record<Role, string> = { admin: "Administrador", empresa: "Empresa", egresado: "Egresado" };

  return (
    <div style={{ position: "fixed", top: 0, left: 240, right: 0, height: 62, background: "#fff", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 26px", zIndex: 99, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>{screenTitleForRole(role, screen)}</div>
        <div style={{ fontSize: 11, color: "#94A3B8" }}>Sistema de Seguimiento de Egresados y Bolsa Laboral · Universidad de Huánuco (UDH)</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={() => setScreen("notificaciones")} style={{ position: "relative", width: 36, height: 36, borderRadius: 8, border: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Bell size={16} color="#64748B" />
          {unreadCount > 0 && <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: "#EF4444", border: "2px solid #fff" }} />}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12 }}>{avatar}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{userName}</div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>{roles[role]}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <FeedbackProvider>
      <AppContent />
    </FeedbackProvider>
  );
}

function AppContent() {
  const { toast } = useFeedback();
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());
  const [sessionChecked, setSessionChecked] = useState(() => readStoredSession() === null);
  const [screen, setScreenState] = useState<Screen>(() => {
    const storedSession = readStoredSession();
    return storedSession ? readLastScreenForRole(storedSession.role) : "admin-dashboard";
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsRefreshKey, setNotificationsRefreshKey] = useState(0);

  const loggedIn = session != null;
  const role: Role = session?.role ?? "admin";

  useEffect(() => {
    let active = true;
    const storedSession = readStoredSession();

    if (!storedSession) {
      setSessionChecked(true);
      return () => {
        active = false;
      };
    }

    setSessionChecked(false);
    validateStoredSession(storedSession)
      .then((validSession) => {
        if (!active) return;

        if (validSession) {
          saveSession(validSession);
          setSession(validSession);
          setScreenState(readLastScreenForRole(validSession.role));
        } else {
          clearSession();
          setSession(null);
          setScreenState("admin-dashboard");
          setUnreadCount(0);
        }
      })
      .finally(() => {
        if (active) setSessionChecked(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!session) {
      setUnreadCount(0);
      return () => {
        active = false;
      };
    }

    adminApi.notificacionesNoLeidas()
      .then(({ unread }) => {
        if (active) setUnreadCount(unread);
      })
      .catch(() => {
        if (active) setUnreadCount(0);
      });

    return () => {
      active = false;
    };
  }, [session?.token, screen, notificationsRefreshKey]);

  function setScreen(nextScreen: Screen) {
    if (!session) return;

    const validScreen = canAccessScreen(session.role, nextScreen) ? nextScreen : HOME_BY_ROLE[session.role];
    saveLastScreenForRole(session.role, validScreen);
    setScreenState(validScreen);
  }

  function handleLogin(nextSession: AuthSession) {
    saveSession(nextSession);
    saveLastScreenForRole(nextSession.role, HOME_BY_ROLE[nextSession.role]);
    setSession(nextSession);
    setSessionChecked(true);
    setScreenState(HOME_BY_ROLE[nextSession.role]);
    toast("success", "Sesión iniciada correctamente.");
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    setScreenState("admin-dashboard");
    toast("info", "Sesión cerrada correctamente.");
  }

  if (!sessionChecked) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "Inter, system-ui, sans-serif", color: "#475569", background: "#F1F5F9", fontSize: 14 }}>
        Validando sesión...
      </div>
    );
  }

  if (!loggedIn) return <LoginScreen onLogin={handleLogin} />;

  function renderScreen() {
    switch (screen) {
      case "admin-dashboard": return <AdminDashboard setScreen={setScreen} />;
      case "admin-egresados": return <AdminEgresados />;
      case "admin-empresas": return <AdminEmpresas />;
      case "admin-ofertas": return <AdminOfertas useApi={role === "admin"} setScreen={setScreen} />;
      case "admin-encuestas": return <AdminEncuestas />;
      case "admin-reportes": return <Reportes />;
      case "admin-config": return <Configuracion />;
      case "admin-auditoria": return <Auditoria />;
      case "admin-sql-evidencias": return <SqlEvidencias />;
      case "emp-dashboard": return <EmpresaDashboard setScreen={setScreen} />;
      case "emp-crear-oferta": return <CrearOferta setScreen={setScreen} />;
      case "emp-postulaciones": return <PostulacionesRecibidas />;
      case "emp-perfil": return <PerfilEmpresa />;
      case "egr-dashboard": return <EgresadoDashboard setScreen={setScreen} />;
      case "egr-bolsa": return <BolsaLaboral />;
      case "egr-postulaciones": return <MisPostulaciones />;
      case "egr-encuesta": return <EncuestaSeguimiento onNotificationsChanged={() => setNotificationsRefreshKey(k => k + 1)} />;
      case "egr-perfil": return <MiPerfil />;
      case "egr-historial": return <HistorialLaboral />;
      case "notificaciones": return <Notificaciones useApi={role === "admin" || role === "empresa" || role === "egresado"} canManage={role === "admin"} unreadTotal={unreadCount} onNotificationsChanged={() => setNotificationsRefreshKey(k => k + 1)} />;
      default: return null;
    }
  }

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <Sidebar session={session} role={role} screen={screen} setScreen={setScreen} onLogout={handleLogout} unreadCount={unreadCount} />
      <TopNav session={session} role={role} screen={screen} setScreen={setScreen} unreadCount={unreadCount} />
      <main style={{ marginLeft: 240, paddingTop: 62, minHeight: "100vh", background: "#F1F5F9" }}>
        <div style={{ padding: 26 }}>{renderScreen()}</div>
      </main>
    </div>
  );
}
