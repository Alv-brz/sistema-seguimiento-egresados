import { pool } from "../../config/db.js";
import type { PaginatedResult, PaginationInput } from "../../utils/pagination.js";

export type NotificacionesFilters = {
  search?: string;
  estado?: string;
};

export type NotificacionInput = {
  titulo: string;
  mensaje: string;
};

export async function createNotificacion(id_usuario: number, input: NotificacionInput) {
  const [result] = await pool.execute(
    `INSERT INTO notificacion(id_usuario, titulo, mensaje, leido, fecha_envio)
     VALUES (?, ?, ?, FALSE, NOW())`,
    [id_usuario, input.titulo, input.mensaje]
  );

  return result;
}

export async function listNotificaciones(
  id_usuario: number,
  pagination: PaginationInput,
  filters: NotificacionesFilters
): Promise<PaginatedResult<unknown>> {
  const where = ["id_usuario = ?"];
  const params: (string | number | boolean)[] = [id_usuario];

  if (filters.search) {
    where.push("(titulo LIKE ? OR mensaje LIKE ?)");
    const q = `%${filters.search}%`;
    params.push(q, q);
  }

  if (filters.estado === "Leídas") {
    where.push("leido = TRUE");
  } else if (filters.estado === "No leídas") {
    where.push("leido = FALSE");
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM notificacion ${whereSql}`,
    params
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
     ${whereSql}
     ORDER BY fecha_envio DESC, id_notificacion DESC
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

export async function deleteNotificacion(id_usuario: number, id_notificacion: number) {
  const [result] = await pool.execute(
    "DELETE FROM notificacion WHERE id_notificacion = ? AND id_usuario = ?",
    [id_notificacion, id_usuario]
  );

  return result;
}
