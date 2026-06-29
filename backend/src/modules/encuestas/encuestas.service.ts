import { pool } from "../../config/db.js";
import type { PaginatedResult, PaginationInput } from "../../utils/pagination.js";

export type EncuestasFilters = {
  search?: string;
  estadoLaboral?: string;
};

function buildEncuestasWhere(filters: EncuestasFilters) {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    where.push("(ve.egresado LIKE ? OR es.nombre_empresa_actual LIKE ? OR es.cargo_actual LIKE ? OR es.area_trabajo LIKE ?)");
    const q = `%${filters.search}%`;
    params.push(q, q, q, q);
  }

  if (filters.estadoLaboral) {
    where.push("es.estado_laboral = ?");
    params.push(filters.estadoLaboral);
  }

  return {
    whereSql: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
}

const ENCUESTAS_SELECT = `SELECT
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
  fn_nombre_completo(se.id_egresado) AS egresado,
  se.fecha_asociacion
 FROM encuesta_seguimiento es
 INNER JOIN seguimiento_egresado se ON se.id_encuesta = es.id_encuesta
 INNER JOIN vw_encuestas_egresados ve ON ve.id_seguimiento = se.id_seguimiento
 INNER JOIN egresado e ON e.id_usuario = se.id_egresado`;

export async function listEncuestas(
  pagination: PaginationInput,
  filters: EncuestasFilters
): Promise<PaginatedResult<unknown>> {
  const { whereSql, params } = buildEncuestasWhere(filters);

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM encuesta_seguimiento es
     INNER JOIN seguimiento_egresado se ON se.id_encuesta = es.id_encuesta
     INNER JOIN vw_encuestas_egresados ve ON ve.id_seguimiento = se.id_seguimiento
     INNER JOIN egresado e ON e.id_usuario = se.id_egresado
     ${whereSql}`,
    params
  );

  const [rows] = await pool.query(
    `${ENCUESTAS_SELECT}
     ${whereSql}
     ORDER BY es.fecha_registro DESC, es.id_encuesta DESC
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

export async function listEncuestasForExport(filters: EncuestasFilters): Promise<Record<string, unknown>[]> {
  const { whereSql, params } = buildEncuestasWhere(filters);
  const [rows] = await pool.query(
    `${ENCUESTAS_SELECT}
     ${whereSql}
     ORDER BY es.fecha_registro DESC, es.id_encuesta DESC`,
    params
  );
  return rows as Record<string, unknown>[];
}
