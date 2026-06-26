import { pool } from "../../config/db.js";

export async function listAuditoria() {
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
     ORDER BY fecha_evento DESC, id_auditoria DESC
     LIMIT 500`
  );

  return rows;
}
