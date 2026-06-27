import { pool } from "../../config/db.js";
import type { PaginatedResult, PaginationInput } from "../../utils/pagination.js";

export async function listNotificaciones(
  id_usuario: number,
  pagination: PaginationInput
): Promise<PaginatedResult<unknown>> {
  const [countRows] = await pool.execute(
    "SELECT COUNT(*) AS total FROM notificacion WHERE id_usuario = ?",
    [id_usuario]
  );

  const [rows] = await pool.query(
    `SELECT
       id_notificacion,
       id_usuario,
       titulo,
       mensaje,
       leido,
       fecha_envio
     FROM notificacion
     WHERE id_usuario = ?
     ORDER BY fecha_envio DESC, id_notificacion DESC
     LIMIT ? OFFSET ?`,
    [id_usuario, pagination.pageSize, pagination.offset]
  );

  return {
    items: rows,
    total: Number((countRows as { total: number }[])[0]?.total ?? 0),
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
}

export async function countUnreadNotificaciones(id_usuario: number): Promise<number> {
  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS total FROM notificacion WHERE id_usuario = ? AND leido = FALSE",
    [id_usuario]
  );

  return Number((rows as { total: number }[])[0]?.total ?? 0);
}

export async function markNotificacionLeida(id_usuario: number, id_notificacion: number) {
  const [result] = await pool.execute(
    "UPDATE notificacion SET leido = TRUE WHERE id_notificacion = ? AND id_usuario = ?",
    [id_notificacion, id_usuario]
  );

  return result;
}

export async function markAllNotificacionesLeidas(id_usuario: number) {
  const [result] = await pool.execute(
    "UPDATE notificacion SET leido = TRUE WHERE id_usuario = ? AND leido = FALSE",
    [id_usuario]
  );

  return result;
}
