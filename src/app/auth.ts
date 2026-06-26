export type AuthRole = "admin" | "empresa" | "egresado";

export type AuthSession = {
  id_usuario: number;
  nombre_usuario: string;
  role: AuthRole;
  token: string;
};

type DemoCredentials = {
  nombre_usuario: string;
  password: string;
};

type AuthFailureReason = "empty" | "invalid" | "inactive" | "role-not-found" | "network";

type AuthResult =
  | { ok: true; session: AuthSession }
  | { ok: false; reason: AuthFailureReason };

const SESSION_STORAGE_KEY = "seg_egresado_bolsa.session";
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3001/api").replace(/\/$/, "");

const DEMO_CREDENTIALS: Record<AuthRole, DemoCredentials> = {
  admin: { nombre_usuario: "admin.general001", password: "Admin123*" },
  empresa: { nombre_usuario: "finanzasugartes14768", password: "%0r1MFj6Qp" },
  egresado: { nombre_usuario: "bartolomé.vicente85683", password: "&19LW%iOD&" },
};

export async function authenticateUser(
  nombre_usuario: string,
  password: string
): Promise<AuthResult> {
  const cleanUser = nombre_usuario.trim();

  if (!cleanUser || !password) {
    return { ok: false, reason: "empty" };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre_usuario: cleanUser, password }),
    });

    const data = (await response.json()) as unknown;

    if (response.ok && isAuthSuccess(data)) {
      return { ok: true, session: data.session };
    }

    if (isAuthFailure(data)) {
      return { ok: false, reason: data.reason };
    }

    return { ok: false, reason: "invalid" };
  } catch {
    return { ok: false, reason: "network" };
  }
}

export function getDemoCredentials(role: AuthRole): DemoCredentials {
  return DEMO_CREDENTIALS[role];
}

export async function getDemoSession(role: AuthRole): Promise<AuthSession | null> {
  const credentials = getDemoCredentials(role);
  const result = await authenticateUser(credentials.nombre_usuario, credentials.password);
  return result.ok ? result.session : null;
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function readStoredSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (isSession(parsed)) {
      return parsed;
    }
  } catch {
    clearSession();
    return null;
  }

  clearSession();
  return null;
}

export function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

function isAuthSuccess(value: unknown): value is { ok: true; session: AuthSession } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const result = value as { ok?: unknown; session?: unknown };
  return result.ok === true && isSession(result.session);
}

function isAuthFailure(value: unknown): value is { ok: false; reason: AuthFailureReason } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const result = value as { ok?: unknown; reason?: unknown };

  return (
    result.ok === false &&
    (result.reason === "empty" ||
      result.reason === "invalid" ||
      result.reason === "inactive" ||
      result.reason === "role-not-found" ||
      result.reason === "network")
  );
}

function isSession(value: unknown): value is AuthSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const session = value as Partial<AuthSession>;

  return (
    typeof session.id_usuario === "number" &&
    typeof session.nombre_usuario === "string" &&
    typeof session.token === "string" &&
    session.token.length > 0 &&
    (session.role === "admin" || session.role === "empresa" || session.role === "egresado")
  );
}
