import { pool } from "../../config/db.js";

export async function listNotificaciones(id_usuario: number) {
  const [rows] = await pool.execute(
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
     LIMIT 100`,
    [id_usuario]
  );

  return rows;
}
