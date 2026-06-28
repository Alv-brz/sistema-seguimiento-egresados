import { pool } from "../../config/db.js";
import type { PaginatedResult, PaginationInput } from "../../utils/pagination.js";

export type AuditoriaFilters = {
  search?: string;
  tabla?: string;
  accion?: string;
};

export async function registerAuditEvent(input: {
  tabla: string;
  accion: "INSERT" | "UPDATE" | "DELETE";
  idRegistro: number;
  descripcion: string;
  usuario?: string;
}) {
  await pool.execute(
    `INSERT INTO auditoria(
       tabla_afectada,
       accion,
       id_registro,
       descripcion,
       usuario_bd
     )
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.tabla,
      input.accion,
      input.idRegistro,
      input.descripcion,
      input.usuario ?? null,
    ]
  );
}

export async function listAuditoria(
  pagination: PaginationInput,
  filters: AuditoriaFilters
): Promise<PaginatedResult<unknown>> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    where.push("(descripcion LIKE ? OR usuario_bd LIKE ? OR tabla_afectada LIKE ?)");
    const q = `%${filters.search}%`;
    params.push(q, q, q);
  }

  if (filters.tabla) {
    where.push("tabla_afectada = ?");
    params.push(filters.tabla);
  }

  if (filters.accion) {
    where.push("accion = ?");
    params.push(filters.accion);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM auditoria
     ${whereSql}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT
       id_auditoria,
       tabla_afectada,
       accion,
       id_registro,
       descripcion,
       fecha_evento,
       usuario_bd
     FROM auditoria
     ${whereSql}
     ORDER BY fecha_evento DESC, id_auditoria DESC
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
