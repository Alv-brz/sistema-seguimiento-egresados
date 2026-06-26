import { pool } from "../../config/db.js";

export async function listEgresados() {
  const [rows] = await pool.query(
    `SELECT
       e.id_usuario,
       e.dni,
       e.nombre_egresado,
       e.apellidos_egresado,
       e.telefono,
       e.direccion,
       e.fecha_egreso,
       e.sexo,
       c.nombre_carrera,
       c.grado_academico,
       f.nombre_facultad,
       u.nombre_usuario,
       u.correo,
       u.estado_usuario,
       u.fecha_creacion,
       u.ultimo_acceso
     FROM egresado e
     INNER JOIN usuario u ON u.id_usuario = e.id_usuario
     INNER JOIN carrera c ON c.id_carrera = e.id_carrera
     INNER JOIN facultad f ON f.id_facultad = c.id_facultad
     ORDER BY e.id_usuario
     LIMIT 500`
  );

  return rows;
}
