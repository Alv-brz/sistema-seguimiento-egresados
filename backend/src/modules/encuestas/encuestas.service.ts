import { pool } from "../../config/db.js";
import type { PaginatedResult, PaginationInput } from "../../utils/pagination.js";

export type EncuestasFilters = {
  estadoLaboral?: string;
};

export async function listEncuestas(
  pagination: PaginationInput,
  filters: EncuestasFilters
): Promise<PaginatedResult<unknown>> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.estadoLaboral) {
    where.push("es.estado_laboral = ?");
    params.push(filters.estadoLaboral);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM encuesta_seguimiento es
     INNER JOIN seguimiento_egresado se ON se.id_encuesta = es.id_encuesta
     INNER JOIN egresado e ON e.id_usuario = se.id_egresado
     ${whereSql}`,
    params
  );

  const [rows] = await pool.query(
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
       CONCAT(e.nombre_egresado, ' ', e.apellidos_egresado) AS egresado,
       se.fecha_asociacion
     FROM encuesta_seguimiento es
     INNER JOIN seguimiento_egresado se ON se.id_encuesta = es.id_encuesta
     INNER JOIN egresado e ON e.id_usuario = se.id_egresado
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
