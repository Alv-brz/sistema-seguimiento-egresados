import { pool } from "../../config/db.js";
import type { PaginatedResult, PaginationInput } from "../../utils/pagination.js";

export type BolsaFilters = {
  search?: string;
  modalidad?: string;
  contrato?: string;
};

export type EgresadoPostulacionesFilters = {
  estado?: string;
};

export async function getEgresadoPerfil(idEgresado: number) {
  const [rows] = await pool.execute(
    `SELECT
       e.id_usuario,
       e.dni,
       e.nombre_egresado,
       e.apellidos_egresado,
       e.telefono,
       e.direccion,
       e.fecha_egreso,
       e.sexo,
       c.nombre_carrera,
       c.grado_academico,
       f.nombre_facultad,
       u.nombre_usuario,
       u.correo,
       u.estado_usuario,
       u.fecha_creacion,
       u.ultimo_acceso
     FROM egresado e
     INNER JOIN usuario u ON u.id_usuario = e.id_usuario
     INNER JOIN carrera c ON c.id_carrera = e.id_carrera
     INNER JOIN facultad f ON f.id_facultad = c.id_facultad
     WHERE e.id_usuario = ?`,
    [idEgresado]
  );

  return (rows as unknown[])[0] ?? null;
}

export async function getEgresadoDashboard(idEgresado: number) {
  const [metricsRows] = await pool.execute(
    `SELECT
       fn_total_postulaciones(?) AS totalPostulaciones,
       fn_estado_laboral_actual(?) AS estadoLaboralActual,
       fn_ultima_empresa(?) AS ultimaEmpresa,
       (SELECT COUNT(*) FROM oferta_laboral WHERE estado_oferta = 'Activa') AS ofertasActivas`,
    [idEgresado, idEgresado, idEgresado]
  );

  const [ofertasRows] = await pool.query(
    `SELECT
       o.id_oferta,
       o.titulo,
       o.descripcion,
       o.puesto,
       o.area,
       o.ubicacion,
       o.modalidad,
       o.tipo_contrato,
       o.salario,
       o.requisitos,
       o.fecha_publicacion,
       o.fecha_cierre,
       o.estado_oferta,
       em.razon_social AS empresa
     FROM oferta_laboral o
     INNER JOIN empresa em ON em.id_usuario = o.id_empresa
     WHERE o.estado_oferta = 'Activa'
     ORDER BY o.fecha_publicacion DESC, o.id_oferta DESC
     LIMIT 3`
  );

  const [historialRows] = await pool.execute(
    "SELECT COUNT(*) AS total FROM historial_laboral WHERE id_egresado = ?",
    [idEgresado]
  );
  const [encuestaRows] = await pool.execute(
    "SELECT COUNT(*) AS total FROM seguimiento_egresado WHERE id_egresado = ?",
    [idEgresado]
  );

  const metrics = (metricsRows as Record<string, unknown>[])[0] ?? {};
  return {
    profile: await getEgresadoPerfil(idEgresado),
    metrics: {
      totalPostulaciones: Number(metrics.totalPostulaciones ?? 0),
      estadoLaboralActual: String(metrics.estadoLaboralActual ?? "Sin encuesta"),
      ultimaEmpresa: String(metrics.ultimaEmpresa ?? "Sin historial"),
      ofertasActivas: Number(metrics.ofertasActivas ?? 0),
      historialRegistrado: Number((historialRows as { total: number }[])[0]?.total ?? 0) > 0,
      encuestaCompletada: Number((encuestaRows as { total: number }[])[0]?.total ?? 0) > 0,
    },
    ofertasRecomendadas: ofertasRows,
  };
}

export async function listBolsaLaboral(
  pagination: PaginationInput,
  filters: BolsaFilters
): Promise<PaginatedResult<unknown>> {
  const where = ["o.estado_oferta = 'Activa'"];
  const params: unknown[] = [];

  if (filters.search) {
    where.push("(o.titulo LIKE ? OR o.puesto LIKE ? OR o.area LIKE ? OR em.razon_social LIKE ?)");
    const q = `%${filters.search}%`;
    params.push(q, q, q, q);
  }

  if (filters.modalidad) {
    where.push("o.modalidad = ?");
    params.push(filters.modalidad);
  }

  if (filters.contrato) {
    where.push("o.tipo_contrato = ?");
    params.push(filters.contrato);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM oferta_laboral o
     INNER JOIN empresa em ON em.id_usuario = o.id_empresa
     ${whereSql}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT
       o.id_oferta,
       o.titulo,
       o.descripcion,
       o.puesto,
       o.area,
       o.ubicacion,
       o.modalidad,
       o.tipo_contrato,
       o.salario,
       o.requisitos,
       o.fecha_publicacion,
       o.fecha_cierre,
       o.estado_oferta,
       em.razon_social AS empresa
     FROM oferta_laboral o
     INNER JOIN empresa em ON em.id_usuario = o.id_empresa
     ${whereSql}
     ORDER BY o.fecha_publicacion DESC, o.id_oferta DESC
     LIMIT ? OFFSET ?`,
    [...params, pagination.pageSize, pagination.offset]
  );

  return {
    items: rows,
    total: Number((countRows as { total: number }[])[0]?.total ?? 0),
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
}

export async function listEgresadoPostulaciones(
  idEgresado: number,
  pagination: PaginationInput,
  filters: EgresadoPostulacionesFilters
): Promise<PaginatedResult<unknown>> {
  const where = ["p.id_egresado = ?"];
  const params: unknown[] = [idEgresado];

  if (filters.estado) {
    where.push("p.estado_postulacion = ?");
    params.push(filters.estado);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM postulacion p
     ${whereSql}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT
       p.id_postulacion,
       o.titulo AS oferta,
       em.razon_social AS empresa,
       p.fecha_postulacion,
       p.estado_postulacion,
       p.observaciones,
       p.cv_adjunto
     FROM postulacion p
     INNER JOIN oferta_laboral o ON o.id_oferta = p.id_oferta
     INNER JOIN empresa em ON em.id_usuario = o.id_empresa
     ${whereSql}
     ORDER BY p.fecha_postulacion DESC, p.id_postulacion DESC
     LIMIT ? OFFSET ?`,
    [...params, pagination.pageSize, pagination.offset]
  );

  return {
    items: rows,
    total: Number((countRows as { total: number }[])[0]?.total ?? 0),
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
}

export async function listHistorialLaboral(
  idEgresado: number,
  pagination: PaginationInput
): Promise<PaginatedResult<unknown>> {
  const [countRows] = await pool.execute(
    "SELECT COUNT(*) AS total FROM historial_laboral WHERE id_egresado = ?",
    [idEgresado]
  );

  const [rows] = await pool.query(
    `SELECT
       id_historial,
       nombre_empresa,
       cargo,
       fecha_inicio,
       fecha_fin,
       salario,
       modalidad,
       actual
     FROM historial_laboral
     WHERE id_egresado = ?
     ORDER BY fecha_inicio DESC, id_historial DESC
     LIMIT ? OFFSET ?`,
    [idEgresado, pagination.pageSize, pagination.offset]
  );

  return {
    items: rows,
    total: Number((countRows as { total: number }[])[0]?.total ?? 0),
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
}

export async function getUltimaEncuesta(idEgresado: number) {
  const [rows] = await pool.execute(
    `SELECT
       es.id_encuesta,
       es.fecha_registro,
       es.estado_laboral,
       es.nombre_empresa_actual,
       es.cargo_actual,
       es.area_trabajo,
       es.sueldo_mensual,
       es.tipo_contrato,
       es.satisfaccion_profesional,
       es.tiempo_conseguir_empleo,
       es.observaciones,
       se.fecha_asociacion,
       DATE_ADD(es.fecha_registro, INTERVAL 6 MONTH) AS proxima_disponible,
       CASE WHEN CURDATE() >= DATE_ADD(es.fecha_registro, INTERVAL 6 MONTH) THEN 1 ELSE 0 END AS can_submit
     FROM seguimiento_egresado se
     INNER JOIN encuesta_seguimiento es ON es.id_encuesta = se.id_encuesta
     WHERE se.id_egresado = ?
     ORDER BY es.fecha_registro DESC, es.id_encuesta DESC
     LIMIT 1`,
    [idEgresado]
  );

  return (rows as unknown[])[0] ?? null;
}
