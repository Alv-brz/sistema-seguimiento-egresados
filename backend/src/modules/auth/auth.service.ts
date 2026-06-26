import { pool } from "../../config/db.js";
import type { RowDataPacket } from "mysql2";
import { signToken, type AuthRole } from "../../config/jwt.js";

// Resultado del intento de autenticación. Mantiene la misma taxonomía de
// "reason" que usa el frontend en src/app/auth.ts para sus mensajes.
export type AuthResult =
  | { ok: true; session: AuthSession }
  | { ok: false; reason: "empty" | "invalid" | "inactive" | "role-not-found" };

export type AuthSession = {
  id_usuario: number;
  nombre_usuario: string;
  role: AuthRole;
  token: string;
};

// Estructura de la fila leída de la tabla usuario.
type UsuarioRow = {
  id_usuario: number;
  nombre_usuario: string;
  password: string;
  estado_usuario: string;
};

/**
 * Autentica a un usuario contra la tabla `usuario`.
 *
 * - Valida que vengan usuario y password.
 * - Compara password en texto plano (la BD actual lo almacena así; sin bcrypt
 *   por ahora, según las restricciones de la Fase 1).
 * - Verifica estado_usuario = 'Activo'.
 * - Resuelve el rol consultando las tablas administrador / empresa / egresado.
 * - Emite un JWT con { id_usuario, role }.
 *
 * No escribe en la BD (modo solo lectura en esta fase).
 */
export async function authenticateUser(
  nombre_usuario: string,
  password: string
): Promise<AuthResult> {
  const cleanUser = nombre_usuario.trim();

  if (!cleanUser || !password) {
    return { ok: false, reason: "empty" };
  }

  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT id_usuario, nombre_usuario, password, estado_usuario FROM usuario WHERE nombre_usuario = ?",
    [cleanUser]
  );

  const user = rows[0] as UsuarioRow | undefined;

  // Usuario inexistente o password incorrecta → mismo reason para no filtrar
  // qué usuarios existen (evitar user enumeration).
  if (!user || user.password !== password) {
    return { ok: false, reason: "invalid" };
  }

  if (user.estado_usuario !== "Activo") {
    return { ok: false, reason: "inactive" };
  }

  const role = await resolveRole(user.id_usuario);

  if (!role) {
    return { ok: false, reason: "role-not-found" };
  }

  const token = signToken({ id_usuario: user.id_usuario, role });
  await pool.execute("UPDATE usuario SET ultimo_acceso = NOW() WHERE id_usuario = ?", [
    user.id_usuario,
  ]);

  // El token se incluye en la sesión para que el frontend pueda enviarlo en
  // las peticiones autenticadas de las siguientes fases.
  const session: AuthSession = {
    id_usuario: user.id_usuario,
    nombre_usuario: user.nombre_usuario,
    role,
    token,
  };

  return { ok: true, session };
}

export async function getAuthenticatedSession(
  id_usuario: number,
  token: string
): Promise<AuthResult> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT id_usuario, nombre_usuario, estado_usuario FROM usuario WHERE id_usuario = ?",
    [id_usuario]
  );

  const user = rows[0] as Omit<UsuarioRow, "password"> | undefined;

  if (!user) {
    return { ok: false, reason: "invalid" };
  }

  if (user.estado_usuario !== "Activo") {
    return { ok: false, reason: "inactive" };
  }

  const role = await resolveRole(user.id_usuario);

  if (!role) {
    return { ok: false, reason: "role-not-found" };
  }

  return {
    ok: true,
    session: {
      id_usuario: user.id_usuario,
      nombre_usuario: user.nombre_usuario,
      role,
      token,
    },
  };
}

// Determina el rol por pertenencia del id_usuario a las tablas hijas.
// Orden: administrador > empresa > egresado (un usuario pertenece a una sola).
export async function resolveRole(id_usuario: number): Promise<AuthRole | null> {
  const [adminRows] = await pool.execute<RowDataPacket[]>(
    "SELECT 1 FROM administrador WHERE id_usuario = ? LIMIT 1",
    [id_usuario]
  );
  if (adminRows.length > 0) return "admin";

  const [empresaRows] = await pool.execute<RowDataPacket[]>(
    "SELECT 1 FROM empresa WHERE id_usuario = ? LIMIT 1",
    [id_usuario]
  );
  if (empresaRows.length > 0) return "empresa";

  const [egresadoRows] = await pool.execute<RowDataPacket[]>(
    "SELECT 1 FROM egresado WHERE id_usuario = ? LIMIT 1",
    [id_usuario]
  );
  if (egresadoRows.length > 0) return "egresado";

  return null;
}
