import { pool } from "../../config/db.js";

export async function listEncuestas() {
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
     ORDER BY es.fecha_registro DESC, es.id_encuesta DESC
     LIMIT 500`
  );

  return rows;
}
