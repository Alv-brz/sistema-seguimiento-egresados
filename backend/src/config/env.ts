import dotenv from "dotenv";

// Carga las variables de .env cuando se ejecuta en desarrollo.
// En producción se espera que vengan del entorno del proceso.
dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(
      `Falta la variable de entorno requerida "${name}". Copia backend/.env.example a backend/.env y complétala.`
    );
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3001),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",

  db: {
    host: required("DB_HOST", "localhost"),
    port: Number(process.env.DB_PORT ?? 3306),
    user: required("DB_USER", "admin_general"),
    password: required("DB_PASSWORD"),
    database: required("DB_NAME", "seg_egresado_bolsa"),
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
  },

  jwt: {
    secret: required("JWT_SECRET"),
    expiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  },
} as const;
