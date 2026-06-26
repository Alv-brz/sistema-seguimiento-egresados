export type AuthRole = "admin" | "empresa" | "egresado";

type UsuarioRecord = {
  id_usuario: number;
  nombre_usuario: string;
  password: string;
  estado_usuario: "Activo" | "Inactivo";
};

type AuthResult =
  | { ok: true; role: AuthRole; id_usuario: number; nombre_usuario: string }
  | { ok: false; reason: "empty" | "invalid" | "inactive" | "role-not-found" };

// Fuente: Database/Proyecto BD seguimiento egresado.sql.
// El rol no existe como campo en usuario; se resuelve por pertenencia a
// administrador, empresa o egresado usando el mismo id_usuario.
const USUARIOS: UsuarioRecord[] = [
  { id_usuario: 25201, nombre_usuario: "admin.general001", password: "Admin123*", estado_usuario: "Activo" },
  { id_usuario: 25001, nombre_usuario: "finanzasugartes14768", password: "%0r1MFj6Qp", estado_usuario: "Activo" },
  { id_usuario: 1, nombre_usuario: "bartolomé.vicente85683", password: "&19LW%iOD&", estado_usuario: "Activo" },
];

const ADMINISTRADOR_IDS = new Set<number>([25201]);
const EMPRESA_IDS = new Set<number>([25001]);
const EGRESADO_IDS = new Set<number>([1]);

function resolveRole(id_usuario: number): AuthRole | null {
  if (ADMINISTRADOR_IDS.has(id_usuario)) return "admin";
  if (EMPRESA_IDS.has(id_usuario)) return "empresa";
  if (EGRESADO_IDS.has(id_usuario)) return "egresado";
  return null;
}

export function authenticateUser(nombre_usuario: string, password: string): AuthResult {
  const cleanUser = nombre_usuario.trim();

  if (!cleanUser || !password) {
    return { ok: false, reason: "empty" };
  }

  const user = USUARIOS.find((u) => u.nombre_usuario === cleanUser && u.password === password);

  if (!user) {
    return { ok: false, reason: "invalid" };
  }

  if (user.estado_usuario !== "Activo") {
    return { ok: false, reason: "inactive" };
  }

  const role = resolveRole(user.id_usuario);

  if (!role) {
    return { ok: false, reason: "role-not-found" };
  }

  return { ok: true, role, id_usuario: user.id_usuario, nombre_usuario: user.nombre_usuario };
}
