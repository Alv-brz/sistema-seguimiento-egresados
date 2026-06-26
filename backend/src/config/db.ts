import mysql from "mysql2/promise";
import { env } from "./env.js";

// Pool único de conexiones a MySQL (BD: seg_egresado_bolsa).
// Se conecta con el usuario admin_general (rol_admin, GRANT ALL PRIVILEGES),
// definido en Database/Usuarios.sql.
export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  connectionLimit: env.db.connectionLimit,
  // Decimal y fecha legibles; el formateo fino lo hace el frontend.
  decimalNumbers: true,
  dateStrings: true,
  charset: "utf8mb4",
});

export type Pool = typeof pool;
