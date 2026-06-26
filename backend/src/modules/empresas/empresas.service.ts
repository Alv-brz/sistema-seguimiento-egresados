import { pool } from "../../config/db.js";

export async function listEmpresas() {
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
     ORDER BY em.id_usuario
     LIMIT 500`
  );

  return rows;
}
