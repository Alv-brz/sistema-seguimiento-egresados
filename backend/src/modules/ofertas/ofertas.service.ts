import { pool } from "../../config/db.js";
import type { PaginatedResult, PaginationInput } from "../../utils/pagination.js";

export type OfertasFilters = {
  estado?: string;
  modalidad?: string;
};

export async function listOfertas(
  pagination: PaginationInput,
  filters: OfertasFilters
): Promise<PaginatedResult<unknown>> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.estado) {
    where.push("o.estado_oferta = ?");
    params.push(filters.estado);
  }

  if (filters.modalidad) {
    where.push("o.modalidad = ?");
    params.push(filters.modalidad);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

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
