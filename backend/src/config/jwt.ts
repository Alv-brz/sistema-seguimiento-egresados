import jwt from "jsonwebtoken";
import type { Secret, SignOptions } from "jsonwebtoken";
import { env } from "./env.js";

// Payload mínimo del token: identificador del usuario y su rol.
export type JwtPayload = {
  id_usuario: number;
  role: AuthRole;
};

// Roles válidos en el sistema (administrador / empresa / egresado),
// resueltos por pertenencia del id_usuario a las tablas homónimas.
export type AuthRole = "admin" | "empresa" | "egresado";

// Firma un JWT con la información mínima del usuario autenticado.
export function signToken(payload: JwtPayload): string {
  const secret: Secret = env.jwt.secret;
  const expiresIn = env.jwt.expiresIn as SignOptions["expiresIn"];

  return jwt.sign(payload, secret, {
    expiresIn,
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, env.jwt.secret);

    if (
      typeof payload === "object" &&
      payload !== null &&
      typeof payload.id_usuario === "number" &&
      (payload.role === "admin" || payload.role === "empresa" || payload.role === "egresado")
    ) {
      return {
        id_usuario: payload.id_usuario,
        role: payload.role,
      };
    }
  } catch {
    return null;
  }

  return null;
}
