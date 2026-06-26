import { pool } from "../../config/db.js";

// Comprueba que el pool llega a MySQL ejecutando SELECT 1.
// Sirve para verificar la configuración de conexión de la Fase 0.
export async function checkDatabaseConnection(): Promise<{ ok: boolean; db: string }> {
  const [rows] = await pool.query("SELECT 1 AS ok");
  const connected = Array.isArray(rows) && rows.length > 0;
  return { ok: connected, db: connected ? "connected" : "disconnected" };
}
