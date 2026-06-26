import { pool } from "../../config/db.js";

export async function listOfertas() {
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
     ORDER BY o.fecha_publicacion DESC, o.id_oferta DESC
     LIMIT 500`
  );

  return rows;
}
