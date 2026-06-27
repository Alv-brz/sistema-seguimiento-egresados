import type { Request, Response, NextFunction } from "express";

// Convierte funciones async en controladores seguros: cualquier rechazo
// llega al errorHandler en lugar de quedar como unhandled rejection.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Manejo centralizado de errores. Devuelve JSON uniforme.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // next se declara para que Express reconozca el middleware de error (4 args).
  _next: NextFunction
) {
  // Errores de MySQL (p.ej. SIGNAL SQLSTATE '45000' de los triggers).
  if (typeof err === "object" && err !== null && "code" in err) {
    const e = err as { code?: string; errno?: number; sqlMessage?: string };
    // ER_SIGNAL_EXCEPTION: un trigger lanzó SIGNAL con un mensaje de validación.
    if (e.code === "ER_SIGNAL_EXCEPTION") {
      return res.status(422).json({
        ok: false,
        error: e.sqlMessage ?? "Validación de base de datos fallida.",
      });
    }
    // ER_DUP_ENTRY: violación de UNIQUE (dni, ruc, correo, nombre_usuario, etc.).
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        ok: false,
        error: "Ya existe un registro con esos datos únicos.",
      });
    }
    // Restricciones de integridad referencial: no eliminar/alterar si hay registros relacionados.
    if (e.code === "ER_ROW_IS_REFERENCED_2" || e.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(409).json({
        ok: false,
        error: "La operación no se puede completar porque existen registros relacionados.",
      });
    }
  }

  console.error("[errorHandler]", err);
  return res.status(500).json({ ok: false, error: "Error interno del servidor." });
}
