import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { pool } from "../../config/db.js";

type SqlValue = string | number | null;

export type SqlEvidenceObject = {
  name: string;
  description: string;
  category?: "numerica" | "texto" | "lectura" | "escritura";
  usesJoins?: boolean;
  usesFunctions?: boolean;
  hasTwoParams?: boolean;
  parameters?: string[];
  restrictions?: string[];
  table?: string;
  action?: "INSERT" | "UPDATE" | "DELETE";
  safeMode?: string;
  realEndpoint?: string;
  realUsage?: string;
  backendFile?: string;
};

const VIEWS: SqlEvidenceObject[] = [
  { name: "vw_egresados_carrera_facultad", description: "Egresados con carrera y facultad.", usesJoins: true },
  { name: "vw_empresa_ofertas", description: "Empresas con sus ofertas laborales.", usesJoins: true },
  { name: "vw_postulaciones_completas", description: "Postulaciones con egresado y oferta.", usesJoins: true, usesFunctions: true },
  { name: "vw_historial_laboral_completo", description: "Historial laboral con nombre del egresado.", usesJoins: true, usesFunctions: true },
  { name: "vw_encuestas_egresados", description: "Encuestas asociadas a egresados.", usesJoins: true, usesFunctions: true },
  { name: "vw_egresados_empleados", description: "Egresados con encuesta en estado empleado.", usesJoins: true, usesFunctions: true },
  { name: "vw_ofertas_activas", description: "Ofertas activas con empresa.", usesJoins: true },
  { name: "vw_cantidad_ofertas_empresa", description: "Total de ofertas por empresa.", usesJoins: true, usesFunctions: true },
  { name: "vw_postulaciones_por_oferta", description: "Total de postulaciones por oferta.", usesJoins: true, usesFunctions: true },
  { name: "vw_promedio_salarial_carrera", description: "Promedio salarial por carrera.", usesJoins: true, usesFunctions: true },
];

const FUNCTIONS: SqlEvidenceObject[] = [
  { name: "fn_total_postulaciones", description: "Cuenta postulaciones de un egresado.", category: "numerica", parameters: ["id_egresado"] },
  { name: "fn_total_ofertas_empresa", description: "Cuenta ofertas de una empresa.", category: "numerica", parameters: ["id_empresa"] },
  { name: "fn_promedio_salario", description: "Calcula salario promedio de un egresado.", category: "numerica", parameters: ["id_egresado"] },
  { name: "fn_nombre_completo", description: "Devuelve nombre completo del egresado.", category: "texto", parameters: ["id_egresado"] },
  { name: "fn_nombre_carrera", description: "Devuelve nombre de carrera.", category: "texto", parameters: ["id_carrera"] },
  { name: "fn_nombre_empresa", description: "Devuelve razón social de empresa.", category: "texto", parameters: ["id_empresa"] },
  { name: "fn_total_egresados_carrera", description: "Cuenta egresados por carrera.", category: "numerica", parameters: ["id_carrera"] },
  { name: "fn_total_encuestas", description: "Cuenta encuestas registradas.", category: "numerica", parameters: [] },
  { name: "fn_estado_laboral_actual", description: "Devuelve último estado laboral de un egresado.", category: "texto", parameters: ["id_egresado"] },
  { name: "fn_ultima_empresa", description: "Devuelve última empresa registrada en historial.", category: "texto", parameters: ["id_egresado"] },
];

const PROCEDURES: SqlEvidenceObject[] = [
  { name: "sp_registrar_empresa", description: "Registra una empresa.", category: "escritura", parameters: ["id_usuario", "ruc", "razon_social", "sector"], hasTwoParams: true, safeMode: "Transacción con ROLLBACK." },
  { name: "sp_actualizar_empresa", description: "Actualiza teléfono y web de empresa.", category: "escritura", parameters: ["id_empresa", "telefono", "pagina_web"], hasTwoParams: true, safeMode: "Transacción con ROLLBACK." },
  { name: "sp_registrar_egresado", description: "Registra un egresado.", category: "escritura", parameters: ["id_usuario", "dni", "nombre", "apellidos", "carrera"], hasTwoParams: true, safeMode: "Transacción con ROLLBACK." },
  { name: "sp_actualizar_egresado", description: "Actualiza teléfono y dirección de egresado.", category: "escritura", parameters: ["id_egresado", "telefono", "direccion"], hasTwoParams: true, safeMode: "Transacción con ROLLBACK." },
  { name: "sp_cambiar_estado_egresado_seguro", description: "Desactiva o reactiva egresado sin borrado físico.", category: "escritura", parameters: ["id_egresado", "estado"], hasTwoParams: true, safeMode: "Flujo real con validación de estado." },
  { name: "sp_cambiar_estado_empresa_seguro", description: "Desactiva o reactiva empresa sin borrado físico.", category: "escritura", parameters: ["id_empresa", "estado"], hasTwoParams: true, safeMode: "Flujo real con validación de estado." },
  { name: "sp_publicar_oferta", description: "Publica una oferta laboral.", category: "escritura", parameters: ["titulo", "empresa", "puesto", "salario"], hasTwoParams: true, safeMode: "Transacción con ROLLBACK." },
  { name: "sp_actualizar_oferta", description: "Actualiza salario y estado de oferta.", category: "escritura", parameters: ["id_oferta", "salario", "estado"], hasTwoParams: true, safeMode: "Transacción con ROLLBACK." },
  { name: "sp_cerrar_oferta", description: "Cierra una oferta de una empresa.", category: "escritura", parameters: ["id_oferta", "empresa"], hasTwoParams: true, safeMode: "Transacción con ROLLBACK." },
  { name: "sp_registrar_postulacion", description: "Registra una postulación.", category: "escritura", parameters: ["egresado", "oferta", "cv"], hasTwoParams: true, safeMode: "Transacción con ROLLBACK sobre oferta temporal." },
  { name: "sp_cambiar_estado_postulacion", description: "Cambia estado de postulación.", category: "escritura", parameters: ["postulacion", "estado"], hasTwoParams: true, safeMode: "Transacción con ROLLBACK." },
  { name: "sp_registrar_encuesta", description: "Registra una encuesta.", category: "escritura", parameters: ["estado_laboral", "empresa_actual", "cargo_actual", "sueldo"], hasTwoParams: true, safeMode: "Transacción con ROLLBACK." },
  { name: "sp_asociar_encuesta_egresado", description: "Asocia encuesta a egresado.", category: "escritura", parameters: ["encuesta", "egresado"], hasTwoParams: true, safeMode: "Transacción con ROLLBACK." },
  { name: "sp_postulaciones_por_empresa", description: "Reporte de postulaciones por empresa y estado.", category: "lectura", parameters: ["empresa", "estado"], usesJoins: true, hasTwoParams: true },
  { name: "sp_egresados_por_carrera", description: "Reporte de egresados por carrera y sexo.", category: "lectura", parameters: ["carrera", "sexo"], usesJoins: true, hasTwoParams: true },
];

const AUDIT_TRIGGERS: SqlEvidenceObject[] = [
  { name: "tr_aud_egresado_insert", description: "Audita creación de egresado.", table: "egresado", action: "INSERT" },
  { name: "tr_aud_egresado_update", description: "Audita actualización de egresado.", table: "egresado", action: "UPDATE" },
  { name: "tr_aud_empresa_insert", description: "Audita creación de empresa.", table: "empresa", action: "INSERT" },
  { name: "tr_aud_empresa_update", description: "Audita actualización de empresa.", table: "empresa", action: "UPDATE" },
  { name: "tr_aud_oferta_insert", description: "Audita creación de oferta.", table: "oferta_laboral", action: "INSERT" },
  { name: "tr_aud_oferta_update", description: "Audita actualización de oferta.", table: "oferta_laboral", action: "UPDATE" },
  { name: "tr_aud_oferta_delete", description: "Audita eliminación de oferta.", table: "oferta_laboral", action: "DELETE" },
  { name: "tr_aud_postulacion_insert", description: "Audita creación de postulación.", table: "postulacion", action: "INSERT" },
  { name: "tr_aud_usuario_estado_update", description: "Audita desactivación/reactivación de usuarios.", table: "usuario", action: "UPDATE" },
  { name: "tr_aud_historial_laboral_delete", description: "Audita eliminación real de historial laboral propio.", table: "historial_laboral", action: "DELETE" },
];

const SIGNAL_TRIGGERS: SqlEvidenceObject[] = [
  { name: "tr_dni_8_digitos", description: "Valida longitud del DNI.", table: "egresado", restrictions: ["DNI debe tener 8 dígitos"] },
  { name: "tr_sexo_valido", description: "Valida sexo del egresado.", table: "egresado", restrictions: ["Sexo permitido: M o F"] },
  { name: "tr_fecha_egreso", description: "Valida fecha de egreso.", table: "egresado", restrictions: ["Fecha de egreso no futura"] },
  { name: "tr_ruc_11_digitos", description: "Valida longitud del RUC.", table: "empresa", restrictions: ["RUC debe tener 11 dígitos"] },
  { name: "tr_web_empresa", description: "Valida web de empresa.", table: "empresa", restrictions: ["Página web debe iniciar con www."] },
  { name: "tr_salario_oferta", description: "Valida salario de oferta.", table: "oferta_laboral", restrictions: ["Salario mayor a 0"] },
  { name: "tr_fecha_cierre_oferta", description: "Valida fechas de oferta.", table: "oferta_laboral", restrictions: ["Fecha de cierre mayor a publicación"] },
  { name: "tr_estado_oferta", description: "Valida estado de oferta.", table: "oferta_laboral", restrictions: ["Estado: Activa o Cerrada"] },
  { name: "tr_salario_historial", description: "Valida salario de historial.", table: "historial_laboral", restrictions: ["Salario no negativo"] },
  { name: "tr_fecha_historial", description: "Valida fechas de historial.", table: "historial_laboral", restrictions: ["Fecha fin posterior a inicio"] },
  { name: "tr_estado_postulacion", description: "Valida estado de postulación.", table: "postulacion", restrictions: ["Estado: Pendiente, Aceptado o Rechazado"] },
  { name: "tr_fecha_postulacion", description: "Valida fecha de postulación.", table: "postulacion", restrictions: ["Fecha de postulación no futura"] },
  { name: "tr_sueldo_encuesta", description: "Valida sueldo de encuesta.", table: "encuesta_seguimiento", restrictions: ["Sueldo mensual no negativo"] },
  { name: "tr_correo_usuario", description: "Valida correo de usuario.", table: "usuario", restrictions: ["Correo con formato básico"] },
  { name: "tr_estado_usuario_update_signal", description: "Valida estado de usuario en desactivar/reactivar.", table: "usuario", restrictions: ["Estado permitido: Activo o Inactivo"] },
];

const MYSQL_ROLES = [
  { role: "rol_admin", user: "admin_general@localhost", permissions: ["ALL PRIVILEGES sobre seg_egresado_bolsa.*"] },
  { role: "rol_empresa", user: "empresa_user@localhost", permissions: ["SELECT, INSERT, UPDATE sobre oferta_laboral", "SELECT sobre postulacion", "SELECT sobre empresa"] },
  { role: "rol_egresado", user: "egresado_user@localhost", permissions: ["SELECT sobre oferta_laboral", "SELECT, INSERT sobre postulacion", "SELECT sobre egresado"] },
];

const REAL_USAGE: Record<string, Pick<SqlEvidenceObject, "realEndpoint" | "realUsage" | "backendFile">> = {
  vw_egresados_carrera_facultad: { realEndpoint: "GET /api/egresados", realUsage: "Listado administrativo de egresados." },
  vw_empresa_ofertas: { realEndpoint: "GET /api/ofertas, GET /api/empresa/ofertas", realUsage: "Listados reales de ofertas." },
  vw_postulaciones_completas: { realEndpoint: "GET /api/empresa/postulaciones, GET /api/egresado/postulaciones", realUsage: "Postulaciones recibidas y propias." },
  vw_historial_laboral_completo: { realEndpoint: "GET /api/egresado/historial", realUsage: "Historial laboral propio." },
  vw_encuestas_egresados: { realEndpoint: "GET /api/encuestas", realUsage: "Gestión administrativa de encuestas." },
  vw_egresados_empleados: { realEndpoint: "GET /api/admin/dashboard", realUsage: "Reporte de estado laboral empleado." },
  vw_ofertas_activas: { realEndpoint: "GET /api/egresado/bolsa, GET /api/egresado/dashboard", realUsage: "Bolsa laboral y recomendaciones." },
  vw_cantidad_ofertas_empresa: { realEndpoint: "GET /api/empresa/dashboard, GET /api/admin/dashboard", realUsage: "KPIs de ofertas por empresa." },
  vw_postulaciones_por_oferta: { realEndpoint: "GET /api/empresa/dashboard", realUsage: "KPI de postulaciones por oferta." },
  vw_promedio_salarial_carrera: { realEndpoint: "GET /api/admin/dashboard", realUsage: "Reporte salarial por carrera." },
  fn_total_postulaciones: { realEndpoint: "GET /api/egresado/dashboard", realUsage: "KPI de postulaciones del egresado." },
  fn_total_ofertas_empresa: { realEndpoint: "GET /api/empresa/dashboard", realUsage: "KPI de ofertas de empresa." },
  fn_promedio_salario: { realEndpoint: "GET /api/egresado/dashboard", realUsage: "KPI de promedio salarial." },
  fn_nombre_completo: { realEndpoint: "GET /api/encuestas", realUsage: "Nombre completo de egresado en reportes." },
  fn_nombre_carrera: { realEndpoint: "GET /api/egresados, GET /api/egresado/perfil", realUsage: "Nombre de carrera desde id." },
  fn_nombre_empresa: { realEndpoint: "GET /api/ofertas", realUsage: "Nombre de empresa desde id." },
  fn_total_egresados_carrera: { realEndpoint: "GET /api/admin/dashboard", realUsage: "Gráfico de egresados por carrera." },
  fn_total_encuestas: { realEndpoint: "GET /api/admin/dashboard", realUsage: "KPI de encuestas sin filtros." },
  fn_estado_laboral_actual: { realEndpoint: "GET /api/egresado/dashboard", realUsage: "KPI de estado laboral actual." },
  fn_ultima_empresa: { realEndpoint: "GET /api/egresado/dashboard", realUsage: "KPI de última empresa." },
  sp_registrar_empresa: { realEndpoint: "POST /api/empresas", realUsage: "Creación admin de empresa con actualización complementaria." },
  sp_actualizar_empresa: { realEndpoint: "PUT /api/empresas/:id, PUT /api/empresa/perfil", realUsage: "Edición de teléfono y web." },
  sp_registrar_egresado: { realEndpoint: "POST /api/egresados", realUsage: "Creación admin de egresado con actualización complementaria." },
  sp_actualizar_egresado: { realEndpoint: "PUT /api/egresados/:id, PUT /api/egresado/perfil", realUsage: "Edición de teléfono y dirección." },
  sp_cambiar_estado_egresado_seguro: { realEndpoint: "PATCH /api/egresados/:id/estado", realUsage: "Desactivación/reactivación operativa sin eliminar egresado." },
  sp_cambiar_estado_empresa_seguro: { realEndpoint: "PATCH /api/empresas/:id/estado", realUsage: "Desactivación/reactivación operativa sin eliminar empresa." },
  sp_publicar_oferta: { realEndpoint: "POST /api/ofertas, POST /api/empresa/ofertas", realUsage: "Creación de oferta con actualización complementaria." },
  sp_actualizar_oferta: { realEndpoint: "PUT /api/ofertas/:id, PUT /api/empresa/ofertas/:id", realUsage: "Edición de salario y estado." },
  sp_cerrar_oferta: { realEndpoint: "PATCH /api/ofertas/:id/estado, PATCH /api/empresa/ofertas/:id/cerrar", realUsage: "Cierre de oferta." },
  sp_registrar_postulacion: { realEndpoint: "POST /api/egresado/postulaciones", realUsage: "Postulación de egresado." },
  sp_cambiar_estado_postulacion: { realEndpoint: "PATCH /api/empresa/postulaciones/:id/estado", realUsage: "Cambio de estado por empresa." },
  sp_registrar_encuesta: { realEndpoint: "POST /api/egresado/encuesta", realUsage: "Registro de encuesta." },
  sp_asociar_encuesta_egresado: { realEndpoint: "POST /api/egresado/encuesta", realUsage: "Asociación encuesta-egresado." },
  sp_postulaciones_por_empresa: { realEndpoint: "GET /api/admin/dashboard, GET /api/empresa/dashboard", realUsage: "Reporte de postulaciones por empresa." },
  sp_egresados_por_carrera: { realEndpoint: "GET /api/admin/dashboard", realUsage: "Reporte de egresados por carrera." },
  tr_aud_egresado_insert: { realEndpoint: "POST /api/egresados", realUsage: "Auditoría por creación de egresado." },
  tr_aud_egresado_update: { realEndpoint: "PUT /api/egresados/:id, PUT /api/egresado/perfil", realUsage: "Auditoría por edición de egresado." },
  tr_aud_empresa_insert: { realEndpoint: "POST /api/empresas", realUsage: "Auditoría por creación de empresa." },
  tr_aud_empresa_update: { realEndpoint: "PUT /api/empresas/:id, PUT /api/empresa/perfil", realUsage: "Auditoría por edición de empresa." },
  tr_aud_oferta_insert: { realEndpoint: "POST /api/ofertas, POST /api/empresa/ofertas", realUsage: "Auditoría por creación de oferta." },
  tr_aud_oferta_update: { realEndpoint: "PUT/PATCH /api/ofertas, PUT/PATCH /api/empresa/ofertas", realUsage: "Auditoría por edición/cierre/reactivación de oferta." },
  tr_aud_oferta_delete: { realEndpoint: "DELETE /api/ofertas/:id, DELETE /api/empresa/ofertas/:id", realUsage: "Auditoría por eliminación segura de oferta sin postulaciones." },
  tr_aud_postulacion_insert: { realEndpoint: "POST /api/egresado/postulaciones", realUsage: "Auditoría por postulación real." },
  tr_aud_usuario_estado_update: { realEndpoint: "PATCH /api/egresados/:id/estado, PATCH /api/empresas/:id/estado", realUsage: "Auditoría real de desactivar/reactivar usuarios." },
  tr_aud_historial_laboral_delete: { realEndpoint: "DELETE /api/egresado/historial/:id", realUsage: "Auditoría real de eliminación de historial laboral propio." },
  tr_dni_8_digitos: { realEndpoint: "POST/PUT /api/egresados, PUT /api/egresado/perfil", realUsage: "Validación de egresado." },
  tr_sexo_valido: { realEndpoint: "POST /api/egresados", realUsage: "Validación de egresado." },
  tr_fecha_egreso: { realEndpoint: "POST /api/egresados", realUsage: "Validación de egresado." },
  tr_ruc_11_digitos: { realEndpoint: "POST /api/empresas", realUsage: "Validación de empresa." },
  tr_web_empresa: { realEndpoint: "POST /api/empresas", realUsage: "Validación de web de empresa." },
  tr_salario_oferta: { realEndpoint: "POST /api/ofertas, POST /api/empresa/ofertas", realUsage: "Validación de oferta." },
  tr_fecha_cierre_oferta: { realEndpoint: "POST /api/ofertas, POST /api/empresa/ofertas", realUsage: "Validación de fechas de oferta." },
  tr_estado_oferta: { realEndpoint: "POST /api/ofertas, POST /api/empresa/ofertas", realUsage: "Validación de estado de oferta." },
  tr_salario_historial: { realEndpoint: "POST /api/egresado/historial", realUsage: "Validación de historial laboral." },
  tr_fecha_historial: { realEndpoint: "POST /api/egresado/historial", realUsage: "Validación de historial laboral." },
  tr_estado_postulacion: { realEndpoint: "POST /api/egresado/postulaciones", realUsage: "Validación de postulación." },
  tr_fecha_postulacion: { realEndpoint: "POST /api/egresado/postulaciones", realUsage: "Validación de postulación." },
  tr_sueldo_encuesta: { realEndpoint: "POST /api/egresado/encuesta", realUsage: "Validación de encuesta." },
  tr_correo_usuario: { realEndpoint: "POST /api/egresados, POST /api/empresas", realUsage: "Validación de usuario." },
  tr_estado_usuario_update_signal: { realEndpoint: "PATCH /api/egresados/:id/estado, PATCH /api/empresas/:id/estado", realUsage: "Validación real de estados de usuario." },
};

function withUsage(objects: SqlEvidenceObject[]) {
  return objects.map((object) => ({
    ...object,
    ...REAL_USAGE[object.name],
    backendFile: REAL_USAGE[object.name]?.backendFile ?? inferBackendFile(REAL_USAGE[object.name]?.realEndpoint ?? ""),
  }));
}

function inferBackendFile(endpoint: string) {
  const files = new Set<string>();
  if (endpoint.includes("/api/admin/dashboard")) files.add("backend/src/modules/admin-dashboard/admin-dashboard.service.ts");
  if (endpoint.includes("/api/admin/configuracion")) files.add("backend/src/modules/admin-configuracion/admin-configuracion.service.ts");
  if (endpoint.includes("/api/egresados")) files.add("backend/src/modules/egresados/egresados.service.ts");
  if (endpoint.includes("/api/empresas")) files.add("backend/src/modules/empresas/empresas.service.ts");
  if (endpoint.includes("/api/ofertas")) files.add("backend/src/modules/ofertas/ofertas.service.ts");
  if (endpoint.includes("/api/encuestas")) files.add("backend/src/modules/encuestas/encuestas.service.ts");
  if (endpoint.includes("/api/empresa/")) files.add("backend/src/modules/empresa/empresa.service.ts");
  if (endpoint.includes("/api/egresado/")) files.add("backend/src/modules/egresado/egresado.service.ts");
  return Array.from(files).join("; ") || "backend/src/modules/admin-sql-evidencias/admin-sql-evidencias.service.ts";
}

function requireKnown(name: string, objects: SqlEvidenceObject[]) {
  const item = objects.find((object) => object.name === name);
  if (!item) {
    const error = new Error("Objeto SQL no permitido.");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }
  return item;
}

async function scalar<T = SqlValue>(connection: PoolConnection, sql: string, params: SqlValue[] = []): Promise<T> {
  const [rows] = await connection.query<RowDataPacket[]>(sql, params);
  return Object.values(rows[0] ?? {})[0] as T;
}

async function sampleIds(connection: PoolConnection) {
  const idEgresado = await scalar<number>(connection, "SELECT id_usuario FROM egresado ORDER BY id_usuario LIMIT 1");
  const idEmpresa = await scalar<number>(connection, "SELECT id_usuario FROM empresa ORDER BY id_usuario LIMIT 1");
  const idCarrera = await scalar<number>(connection, "SELECT id_carrera FROM carrera ORDER BY id_carrera LIMIT 1");
  const idOferta = await scalar<number>(connection, "SELECT id_oferta FROM oferta_laboral ORDER BY id_oferta LIMIT 1");
  const idPostulacion = await scalar<number>(connection, "SELECT id_postulacion FROM postulacion ORDER BY id_postulacion LIMIT 1");
  const idEncuesta = await scalar<number>(connection, "SELECT id_encuesta FROM encuesta_seguimiento ORDER BY id_encuesta LIMIT 1");
  return { idEgresado, idEmpresa, idCarrera, idOferta, idPostulacion, idEncuesta };
}

async function createTempUser(connection: PoolConnection, suffix: string) {
  const marker = randomDigits(10);
  const [result] = await connection.execute(
    `INSERT INTO usuario(nombre_usuario, password, correo, estado_usuario, fecha_creacion)
     VALUES (?, 'Temporal123*', ?, 'Activo', NOW())`,
    [`tmp_${suffix}_${marker}`, `tmp_${suffix}_${marker}@example.com`]
  );
  return Number((result as { insertId: number }).insertId);
}

function randomDigits(length: number) {
  let value = "";
  while (value.length < length) {
    value += String(Math.floor(Math.random() * 10));
  }
  return value;
}

async function createTempEmpresa(connection: PoolConnection) {
  const idUsuario = await createTempUser(connection, "empresa");
  await connection.execute(
    `INSERT INTO empresa(id_usuario, ruc, razon_social, sector, direccion, pagina_web)
     VALUES (?, ?, ?, 'Temporal', 'Dirección Temporal', 'www.Temporal.edu.pe')`,
    [idUsuario, randomDigits(11), `Empresa Temporal SQL ${randomDigits(10)}`]
  );
  return idUsuario;
}

async function createTempEgresado(connection: PoolConnection, idCarrera = 1) {
  const idUsuario = await createTempUser(connection, "egresado");
  await connection.execute(
    `INSERT INTO egresado(id_usuario, dni, nombre_egresado, apellidos_egresado, fecha_egreso, sexo, id_carrera)
     VALUES (?, ?, ?, ?, CURDATE(), 'M', ?)`,
    [idUsuario, randomDigits(8), `Temporal${randomDigits(6)}`, `SQL${randomDigits(6)}`, idCarrera]
  );
  return idUsuario;
}

async function createTempOferta(connection: PoolConnection, idEmpresa: number) {
  const [result] = await connection.execute(
    `INSERT INTO oferta_laboral(titulo, descripcion, puesto, area, ubicacion, modalidad, tipo_contrato, salario, requisitos, fecha_publicacion, fecha_cierre, estado_oferta, id_empresa)
     VALUES ('Oferta Temporal SQL', 'Temporal', 'Analista', 'General', 'Huánuco', 'Presencial', 'Temporal', 1200, 'Temporal', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 10 DAY), 'Activa', ?)`,
    [idEmpresa]
  );
  return Number((result as { insertId: number }).insertId);
}

async function rollbackTemporary<T>(runner: (connection: PoolConnection) => Promise<T>) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const data = await runner(connection);
    await connection.rollback();
    return data;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getSqlEvidenceOverview() {
  return {
    matrix: [
      { type: "Vistas", required: 10, implemented: VIEWS.length, screen: "Evidencias SQL > Vistas", endpoint: "GET /api/admin/sql-evidencias/vistas/:name" },
      { type: "Funciones SQL", required: 10, implemented: FUNCTIONS.length, screen: "Evidencias SQL > Funciones", endpoint: "POST /api/admin/sql-evidencias/funciones/:name/run" },
      { type: "Procedimientos almacenados", required: 15, implemented: PROCEDURES.length, screen: "Evidencias SQL > Procedimientos", endpoint: "POST /api/admin/sql-evidencias/procedimientos/:name/run" },
      { type: "Triggers de auditoría", required: 10, implemented: AUDIT_TRIGGERS.length, screen: "Evidencias SQL > Auditoría", endpoint: "GET /api/admin/sql-evidencias/auditoria/reciente" },
      { type: "Triggers SIGNAL", required: 15, implemented: SIGNAL_TRIGGERS.length, screen: "Evidencias SQL > SIGNAL", endpoint: "POST /api/admin/sql-evidencias/signal/:name/test" },
      { type: "Roles MySQL", required: 3, implemented: MYSQL_ROLES.length, screen: "Evidencias SQL > Usuarios y permisos", endpoint: "GET /api/admin/sql-evidencias/roles" },
    ],
    views: withUsage(VIEWS),
    functions: withUsage(FUNCTIONS),
    procedures: withUsage(PROCEDURES),
    auditTriggers: withUsage(AUDIT_TRIGGERS),
    signalTriggers: withUsage(SIGNAL_TRIGGERS),
    roles: MYSQL_ROLES,
    note: "La matriz muestra únicamente objetos SQL integrados en flujos operativos reales del sistema.",
  };
}

export async function runView(name: string) {
  requireKnown(name, VIEWS);
  const [rows] = await pool.query(`SELECT * FROM ${name} LIMIT 20`);
  return { rows };
}

export async function runFunction(name: string) {
  const object = requireKnown(name, FUNCTIONS);
  const connection = await pool.getConnection();
  try {
    const ids = await sampleIds(connection);
    const paramsByName: Record<string, SqlValue[]> = {
      fn_total_postulaciones: [ids.idEgresado],
      fn_total_ofertas_empresa: [ids.idEmpresa],
      fn_promedio_salario: [ids.idEgresado],
      fn_nombre_completo: [ids.idEgresado],
      fn_nombre_carrera: [ids.idCarrera],
      fn_nombre_empresa: [ids.idEmpresa],
      fn_total_egresados_carrera: [ids.idCarrera],
      fn_total_encuestas: [],
      fn_estado_laboral_actual: [ids.idEgresado],
      fn_ultima_empresa: [ids.idEgresado],
    };
    const params = paramsByName[name] ?? [];
    const placeholders = params.map(() => "?").join(", ");
    const [rows] = await connection.query<RowDataPacket[]>(`SELECT ${name}(${placeholders}) AS result`, params);
    return { object, params, result: rows[0]?.result ?? null };
  } finally {
    connection.release();
  }
}

export async function runProcedure(name: string) {
  const object = requireKnown(name, PROCEDURES);
  const data = await rollbackTemporary(async (connection) => {
    const ids = await sampleIds(connection);
    const tempEmpresa = await createTempEmpresa(connection);
    const tempEgresado = await createTempEgresado(connection, ids.idCarrera);
    const tempOferta = await createTempOferta(connection, tempEmpresa);
    const [postResult] = await connection.execute(
      `INSERT INTO postulacion(id_egresado, id_oferta, fecha_postulacion, estado_postulacion, cv_adjunto)
       VALUES (?, ?, NOW(), 'Pendiente', 'cv-Temporal.pdf')`,
      [tempEgresado, tempOferta]
    );
    const tempPostulacion = Number((postResult as { insertId: number }).insertId);

    const paramsByName: Record<string, SqlValue[]> = {
      sp_registrar_empresa: [await createTempUser(connection, "spempresa"), randomDigits(11), `SP Empresa ${randomDigits(10)}`, "Tecnología"],
      sp_actualizar_empresa: [tempEmpresa, "999888777", "www.actualizada.edu.pe"],
      sp_registrar_egresado: [await createTempUser(connection, "spegresado"), randomDigits(8), "SP Temporal", "Egresado", ids.idCarrera],
      sp_actualizar_egresado: [tempEgresado, "999777555", "Dirección actualizada"],
      sp_cambiar_estado_egresado_seguro: [tempEgresado, "Inactivo"],
      sp_cambiar_estado_empresa_seguro: [tempEmpresa, "Inactivo"],
      sp_publicar_oferta: ["SP Oferta Temporal", tempEmpresa, "Analista SQL", 1800],
      sp_actualizar_oferta: [tempOferta, 2200, "Activa"],
      sp_cerrar_oferta: [tempOferta, tempEmpresa],
      sp_registrar_postulacion: [tempEgresado, await createTempOferta(connection, tempEmpresa), "cv-sp-Temporal.pdf"],
      sp_cambiar_estado_postulacion: [tempPostulacion, "Aceptado"],
      sp_registrar_encuesta: ["Empleado", "Empresa Temporal", "Analista", 2500],
      sp_asociar_encuesta_egresado: [ids.idEncuesta, tempEgresado],
      sp_postulaciones_por_empresa: [ids.idEmpresa, "Pendiente"],
      sp_egresados_por_carrera: [ids.idCarrera, "M"],
    };

    const params = paramsByName[name] ?? [];
    const placeholders = params.map(() => "?").join(", ");
    const [resultSets] = await connection.query(`CALL ${name}(${placeholders})`, params);
    const firstResult = Array.isArray(resultSets) ? resultSets[0] : resultSets;
    return {
      object,
      params,
      rows: Array.isArray(firstResult) ? firstResult : [],
      message: object.category === "escritura" ? "Procedimiento ejecutado con datos temporales y transacción revertida." : "Procedimiento de lectura ejecutado.",
    };
  });
  return data;
}

export async function runAuditEvidence() {
  return rollbackTemporary(async (connection) => {
    const idCarrera = await scalar<number>(connection, "SELECT id_carrera FROM carrera ORDER BY id_carrera LIMIT 1");
    const idEmpresa = await createTempEmpresa(connection);
    const idEgresado = await createTempEgresado(connection, idCarrera);
    const idOferta = await createTempOferta(connection, idEmpresa);
    const idOfertaDelete = await createTempOferta(connection, idEmpresa);

    await connection.execute("UPDATE egresado SET telefono = '999999999' WHERE id_usuario = ?", [idEgresado]);
    await connection.execute("UPDATE empresa SET telefono = '999888777' WHERE id_usuario = ?", [idEmpresa]);
    await connection.execute("UPDATE oferta_laboral SET salario = 1400 WHERE id_oferta = ?", [idOferta]);
    const [postResult] = await connection.execute(
      `INSERT INTO postulacion(id_egresado, id_oferta, fecha_postulacion, estado_postulacion, cv_adjunto)
       VALUES (?, ?, NOW(), 'Pendiente', 'cv-temporal.pdf')`,
      [idEgresado, idOferta]
    );
    await connection.execute(
      `INSERT INTO historial_laboral(nombre_empresa, cargo, fecha_inicio, salario, modalidad, actual, id_egresado)
       VALUES ('Temporal', 'Analista', CURDATE(), 1200, 'Presencial', 1, ?)`,
      [idEgresado]
    );
    const idHistorial = await scalar<number>(connection, "SELECT MAX(id_historial) FROM historial_laboral WHERE id_egresado = ?", [idEgresado]);
    await connection.execute("DELETE FROM historial_laboral WHERE id_historial = ?", [idHistorial]);
    await connection.execute("UPDATE usuario SET estado_usuario = 'Inactivo' WHERE id_usuario = ?", [idEgresado]);
    await connection.execute("DELETE FROM oferta_laboral WHERE id_oferta = ?", [idOfertaDelete]);

    const idPostulacion = Number((postResult as { insertId: number }).insertId);
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT id_auditoria, tabla_afectada, accion, id_registro, descripcion, fecha_evento, usuario_bd
       FROM auditoria
       WHERE (tabla_afectada = 'egresado' AND id_registro = ?)
          OR (tabla_afectada = 'empresa' AND id_registro = ?)
          OR (tabla_afectada = 'oferta_laboral' AND id_registro IN (?, ?))
          OR (tabla_afectada = 'postulacion' AND id_registro = ?)
          OR (tabla_afectada = 'historial_laboral' AND id_registro = ?)
          OR (tabla_afectada = 'usuario' AND id_registro = ?)
       ORDER BY id_auditoria`,
      [idEgresado, idEmpresa, idOferta, idOfertaDelete, idPostulacion, idHistorial, idEgresado]
    );
    return {
      message: "Se ejecutaron operaciones temporales de auditoría dentro de una transacción revertida.",
      rows,
    };
  });
}

export async function recentAuditRows() {
  const [rows] = await pool.query(
    `SELECT id_auditoria, tabla_afectada, accion, id_registro, descripcion, fecha_evento, usuario_bd
     FROM auditoria
     ORDER BY fecha_evento DESC, id_auditoria DESC
     LIMIT 20`
  );
  return rows;
}

export async function runSignalTest(name: string) {
  const object = requireKnown(name, SIGNAL_TRIGGERS);
  return rollbackTemporary(async (connection) => {
    const ids = await sampleIds(connection);
    const tempUser = async (suffix: string) => createTempUser(connection, suffix);
    const tempEmpresa = async () => createTempEmpresa(connection);
    const tempEgresado = async () => createTempEgresado(connection, ids.idCarrera);
    const tempOferta = async () => createTempOferta(connection, await tempEmpresa());

    try {
      if (name === "tr_dni_8_digitos") {
        await connection.execute(`INSERT INTO egresado(id_usuario, dni, nombre_egresado, apellidos_egresado, fecha_egreso, sexo, id_carrera) VALUES (?, '123', 'Temporal', 'Signal', CURDATE(), 'M', ?)`, [await tempUser("dni"), ids.idCarrera]);
      } else if (name === "tr_sexo_valido") {
        await connection.execute(`INSERT INTO egresado(id_usuario, dni, nombre_egresado, apellidos_egresado, fecha_egreso, sexo, id_carrera) VALUES (?, ?, 'Temporal', 'Signal', CURDATE(), 'X', ?)`, [await tempUser("sexo"), randomDigits(8), ids.idCarrera]);
      } else if (name === "tr_fecha_egreso") {
        await connection.execute(`INSERT INTO egresado(id_usuario, dni, nombre_egresado, apellidos_egresado, fecha_egreso, sexo, id_carrera) VALUES (?, ?, 'Temporal', 'Signal', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'M', ?)`, [await tempUser("fecha"), randomDigits(8), ids.idCarrera]);
      } else if (name === "tr_ruc_11_digitos") {
        await connection.execute(`INSERT INTO empresa(id_usuario, ruc, razon_social, sector, direccion) VALUES (?, '123', 'Empresa Signal RUC', 'Temporal', 'Temporal')`, [await tempUser("ruc")]);
      } else if (name === "tr_web_empresa") {
        await connection.execute(`INSERT INTO empresa(id_usuario, ruc, razon_social, sector, direccion, pagina_web) VALUES (?, ?, 'Empresa Signal Web', 'Temporal', 'Temporal', 'https://Temporal.pe')`, [await tempUser("web"), randomDigits(11)]);
      } else if (name === "tr_salario_oferta") {
        await connection.execute(`INSERT INTO oferta_laboral(titulo, descripcion, puesto, area, ubicacion, modalidad, tipo_contrato, salario, fecha_publicacion, fecha_cierre, estado_oferta, id_empresa) VALUES ('Oferta Signal', 'Temporal', 'Temporal', 'Temporal', 'Temporal', 'Presencial', 'Temporal', 0, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'Activa', ?)`, [await tempEmpresa()]);
      } else if (name === "tr_fecha_cierre_oferta") {
        await connection.execute(`INSERT INTO oferta_laboral(titulo, descripcion, puesto, area, ubicacion, modalidad, tipo_contrato, salario, fecha_publicacion, fecha_cierre, estado_oferta, id_empresa) VALUES ('Oferta Signal', 'Temporal', 'Temporal', 'Temporal', 'Temporal', 'Presencial', 'Temporal', 1000, CURDATE(), CURDATE(), 'Activa', ?)`, [await tempEmpresa()]);
      } else if (name === "tr_estado_oferta") {
        await connection.execute(`INSERT INTO oferta_laboral(titulo, descripcion, puesto, area, ubicacion, modalidad, tipo_contrato, salario, fecha_publicacion, fecha_cierre, estado_oferta, id_empresa) VALUES ('Oferta Signal', 'Temporal', 'Temporal', 'Temporal', 'Temporal', 'Presencial', 'Temporal', 1000, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'Pausada', ?)`, [await tempEmpresa()]);
      } else if (name === "tr_salario_historial") {
        await connection.execute(`INSERT INTO historial_laboral(nombre_empresa, cargo, fecha_inicio, salario, modalidad, actual, id_egresado) VALUES ('Temporal', 'Temporal', CURDATE(), -1, 'Presencial', 1, ?)`, [await tempEgresado()]);
      } else if (name === "tr_fecha_historial") {
        await connection.execute(`INSERT INTO historial_laboral(nombre_empresa, cargo, fecha_inicio, fecha_fin, salario, modalidad, actual, id_egresado) VALUES ('Temporal', 'Temporal', CURDATE(), DATE_SUB(CURDATE(), INTERVAL 1 DAY), 1000, 'Presencial', 0, ?)`, [await tempEgresado()]);
      } else if (name === "tr_estado_postulacion") {
        await connection.execute(`INSERT INTO postulacion(id_egresado, id_oferta, fecha_postulacion, estado_postulacion) VALUES (?, ?, NOW(), 'En Proceso')`, [await tempEgresado(), await tempOferta()]);
      } else if (name === "tr_fecha_postulacion") {
        await connection.execute(`INSERT INTO postulacion(id_egresado, id_oferta, fecha_postulacion, estado_postulacion) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), 'Pendiente')`, [await tempEgresado(), await tempOferta()]);
      } else if (name === "tr_sueldo_encuesta") {
        await connection.execute(`INSERT INTO encuesta_seguimiento(fecha_registro, estado_laboral, sueldo_mensual) VALUES (CURDATE(), 'Empleado', -1)`);
      } else if (name === "tr_correo_usuario") {
        await connection.execute(`INSERT INTO usuario(nombre_usuario, password, correo, estado_usuario, fecha_creacion) VALUES (?, 'Temporal123*', 'correo-invalido', 'Activo', NOW())`, [`signal_correo_${Date.now()}`]);
      } else if (name === "tr_estado_usuario_update_signal") {
        await connection.execute("UPDATE usuario SET estado_usuario = 'Suspendido' WHERE id_usuario = ?", [await tempUser("estado")]);
      } else if (name === "tr_configuracion_sistema_update") {
        await connection.execute("UPDATE configuracion_sistema SET correo_institucional = 'correo-invalido' WHERE id_configuracion = 1");
      }
      return { object, ok: false, message: "La prueba no generó SIGNAL." };
    } catch (error) {
      const mysqlError = error as { code?: string; sqlMessage?: string; message?: string };
      if (mysqlError.code === "ER_SIGNAL_EXCEPTION") {
        return { object, ok: true, message: mysqlError.sqlMessage ?? mysqlError.message ?? "SIGNAL capturado." };
      }
      throw error;
    }
  });
}

export async function getRolesEvidence() {
  return {
    roles: MYSQL_ROLES,
    applicationAuth: {
      message: "Los roles MySQL cumplen el requisito académico de permisos. La autorización operativa del aplicativo usa JWT y requireRole('admin'|'empresa'|'egresado') en endpoints Express.",
      protectedEndpoint: "/api/admin/sql-evidencias",
    },
  };
}
