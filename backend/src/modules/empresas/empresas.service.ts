import { pool } from "../../config/db.js";
import type { PaginatedResult, PaginationInput } from "../../utils/pagination.js";

export type EmpresasFilters = {
  search?: string;
  sector?: string;
};

export async function listEmpresas(
  pagination: PaginationInput,
  filters: EmpresasFilters
): Promise<PaginatedResult<unknown>> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    where.push("(em.razon_social LIKE ? OR em.ruc LIKE ? OR em.sector LIKE ?)");
    const q = `%${filters.search}%`;
    params.push(q, q, q);
  }

  if (filters.sector) {
    where.push("em.sector = ?");
    params.push(filters.sector);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM empresa em
     INNER JOIN usuario u ON u.id_usuario = em.id_usuario
     ${whereSql}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT
       em.id_usuario,
       em.ruc,
       em.razon_social,
       em.nombre_comercial,
       em.sector,
       em.direccion,
       em.telefono,
       em.pagina_web,
       u.correo,
       u.estado_usuario
     FROM empresa em
     INNER JOIN usuario u ON u.id_usuario = em.id_usuario
     ${whereSql}
     ORDER BY em.id_usuario
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
