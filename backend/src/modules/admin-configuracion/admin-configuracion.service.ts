import { pool } from "../../config/db.js";

export type ConfiguracionSistemaInput = {
  nombre_universidad: string;
  correo_institucional: string;
  telefono: string | null;
  logo_url: string | null;
  tiempo_entre_encuestas_meses: number;
  estado_sistema: string;
  version_sistema: string;
};

export async function getConfiguracionSistema() {
  const [rows] = await pool.execute(
    `SELECT
       id_configuracion,
       nombre_universidad,
       correo_institucional,
       telefono,
       logo_url,
       tiempo_entre_encuestas_meses,
       estado_sistema,
       version_sistema,
       fecha_creacion,
       fecha_actualizacion
     FROM configuracion_sistema
     WHERE id_configuracion = 1`
  );

  return (rows as unknown[])[0] ?? null;
}

export async function updateConfiguracionSistema(input: ConfiguracionSistemaInput) {
  const [result] = await pool.execute(
    `UPDATE configuracion_sistema
     SET
       nombre_universidad = ?,
       correo_institucional = ?,
       telefono = ?,
       logo_url = ?,
       tiempo_entre_encuestas_meses = ?,
       estado_sistema = ?,
       version_sistema = ?
     WHERE id_configuracion = 1`,
    [
      input.nombre_universidad,
      input.correo_institucional,
      input.telefono,
      input.logo_url,
      input.tiempo_entre_encuestas_meses,
      input.estado_sistema,
      input.version_sistema,
    ]
  );

  return result;
}
