import { pool } from "../../config/db.js";
import type { PaginatedResult, PaginationInput } from "../../utils/pagination.js";
import { createHash } from "node:crypto";

export type NotificacionesFilters = {
  search?: string;
  estado?: string;
};

export type NotificacionInput = {
  titulo: string;
  mensaje: string;
};

type AutomaticNotificationOptions = {
  dedupeHours?: number | null;
  dedupeSeconds?: number | null;
};

function normalizeEstadoFiltro(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function automaticLockName(parts: unknown[]): string {
  const hash = createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 48);
  return `notif:auto:${hash}`;
}

async function withAutomaticNotificationLock<T>(parts: unknown[], action: () => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  const lockName = automaticLockName(parts);

  try {
    const [lockRows] = await connection.execute("SELECT GET_LOCK(?, 5) AS acquired", [lockName]);
    const acquired = Number((lockRows as { acquired: number | null }[])[0]?.acquired ?? 0);
    if (acquired !== 1) {
      throw new Error("No se pudo bloquear la creación de notificación automática.");
    }

    return await action();
  } finally {
    await connection.execute("SELECT RELEASE_LOCK(?)", [lockName]).catch(() => undefined);
    connection.release();
  }
}

export async function createNotificacion(id_usuario: number, input: NotificacionInput) {
  const [result] = await pool.execute(
    `INSERT INTO notificacion(id_usuario, titulo, mensaje, leido, fecha_envio)
     VALUES (?, ?, ?, FALSE, NOW())`,
    [id_usuario, input.titulo, input.mensaje]
  );

  return result;
}

export async function createAutomaticNotificacion(
  id_usuario: number,
  input: NotificacionInput,
  options: AutomaticNotificationOptions = {}
) {
  return withAutomaticNotificationLock([id_usuario, input.titulo, input.mensaje], async () => {
    const dedupeSeconds = options.dedupeSeconds ?? (options.dedupeHours === undefined ? 30 : null);
    const dedupeHours = options.dedupeHours ?? null;
    const params: (string | number)[] = [id_usuario, input.titulo, input.mensaje];
    let recentCondition = "";
    if (dedupeSeconds !== null) {
      recentCondition = "AND fecha_envio >= DATE_SUB(NOW(), INTERVAL ? SECOND)";
      params.push(dedupeSeconds);
    } else if (dedupeHours !== null) {
      recentCondition = "AND fecha_envio >= DATE_SUB(NOW(), INTERVAL ? HOUR)";
      params.push(dedupeHours);
    }

    const [existingRows] = await pool.execute(
      `SELECT n.id_notificacion
       FROM notificacion n
       WHERE n.id_usuario = ?
         AND n.titulo = ?
         AND n.mensaje = ?
         ${recentCondition}
         AND NOT EXISTS (
           SELECT 1
           FROM notificacion newer
           WHERE newer.id_usuario = n.id_usuario
             AND (
               newer.fecha_envio > n.fecha_envio
               OR (newer.fecha_envio = n.fecha_envio AND newer.id_notificacion > n.id_notificacion)
             )
         )
       LIMIT 1`,
      params
    );

    if ((existingRows as unknown[]).length > 0) {
      return { created: false as const };
    }

    const result = await createNotificacion(id_usuario, input);
    return { created: true as const, result };
  });
}

export async function notifyPostulacionEstado(input: {
  idEgresado: number;
  tituloOferta: string;
  estado: "Pendiente" | "Aceptado" | "Rechazado";
}) {
  const estadoTexto = {
    Pendiente: "volvió a estado pendiente",
    Aceptado: "fue aceptada",
    Rechazado: "fue rechazada",
  }[input.estado];

  return createAutomaticNotificacion(input.idEgresado, {
    titulo: "Estado de postulación actualizado",
    mensaje: `Tu postulación a ${input.tituloOferta} ${estadoTexto}.`,
  });
}

export async function notifyOfertaEstado(input: {
  idEgresados: number[];
  tituloOferta: string;
  estado: "Activa" | "Cerrada";
}) {
  const uniqueIds = Array.from(new Set(input.idEgresados));
  const titulo = input.estado === "Cerrada" ? "Oferta cerrada" : "Oferta reactivada";
  const mensaje = input.estado === "Cerrada"
    ? `La oferta ${input.tituloOferta} fue cerrada.`
    : `La oferta ${input.tituloOferta} fue reactivada.`;

  const results = await Promise.all(
    uniqueIds.map((idEgresado) => createAutomaticNotificacion(idEgresado, { titulo, mensaje }))
  );

  return {
    totalDestinatarios: uniqueIds.length,
    creadas: results.filter((result) => result.created).length,
  };
}

export async function notifyCuentaEstado(input: {
  idUsuario: number;
  estado: "Activo" | "Inactivo";
}) {
  return createAutomaticNotificacion(input.idUsuario, {
    titulo: input.estado === "Activo" ? "Cuenta reactivada" : "Cuenta desactivada",
    mensaje: input.estado === "Activo"
      ? "Tu cuenta ha sido reactivada por administración."
      : "Tu cuenta ha sido desactivada por administración.",
  });
}

export async function ensureEncuestaDisponibleNotificacion(idEgresado: number) {
  const [rows] = await pool.execute(
    `SELECT
       es.id_encuesta,
       es.fecha_registro,
       DATE_ADD(es.fecha_registro, INTERVAL cfg.tiempo_entre_encuestas_meses MONTH) AS proxima_disponible,
       CASE
         WHEN cfg.tiempo_entre_encuestas_meses = 0 THEN 1
         WHEN CURDATE() >= DATE_ADD(es.fecha_registro, INTERVAL cfg.tiempo_entre_encuestas_meses MONTH) THEN 1
         ELSE 0
       END AS can_submit
     FROM seguimiento_egresado se
     INNER JOIN encuesta_seguimiento es ON es.id_encuesta = se.id_encuesta
     INNER JOIN configuracion_sistema cfg ON cfg.id_configuracion = 1
     WHERE se.id_egresado = ?
     ORDER BY es.fecha_registro DESC, es.id_encuesta DESC
     LIMIT 1`,
    [idEgresado]
  );

  const encuesta = (rows as { id_encuesta: number; fecha_registro: string; proxima_disponible: string; can_submit: boolean | number }[])[0];
  if (!encuesta || (encuesta.can_submit !== true && encuesta.can_submit !== 1)) {
    return { created: false as const };
  }

  const fechaDisponible = String(encuesta.proxima_disponible).slice(0, 19);
  const encuestaMensaje = `Tu encuesta de seguimiento está disponible desde ${fechaDisponible}. Referencia: ${encuesta.id_encuesta}.`;

  return withAutomaticNotificationLock([idEgresado, "Encuesta disponible", encuesta.id_encuesta], async () => {
    const [existingRows] = await pool.execute(
      `SELECT id_notificacion
       FROM notificacion
       WHERE id_usuario = ?
         AND titulo = 'Encuesta disponible'
         AND mensaje = ?
       LIMIT 1`,
      [idEgresado, encuestaMensaje]
    );

    if ((existingRows as unknown[]).length > 0) {
      return { created: false as const };
    }

    const result = await createNotificacion(idEgresado, {
      titulo: "Encuesta disponible",
      mensaje: encuestaMensaje,
    });

    return { created: true as const, result };
  });
}

export async function listNotificaciones(
  id_usuario: number,
  pagination: PaginationInput,
  filters: NotificacionesFilters
): Promise<PaginatedResult<unknown>> {
  const where = ["id_usuario = ?"];
  const params: (string | number | boolean)[] = [id_usuario];

  if (filters.search) {
    where.push("(titulo LIKE ? OR mensaje LIKE ?)");
    const q = `%${filters.search}%`;
    params.push(q, q);
  }

  const estado = normalizeEstadoFiltro(filters.estado);
  if (estado === "leidas") {
    where.push("leido = TRUE");
  } else if (estado === "no leidas") {
    where.push("leido = FALSE");
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM notificacion ${whereSql}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT
       id_notificacion,
       id_usuario,
       titulo,
       mensaje,
       leido + 0 AS leido,
       fecha_envio
     FROM notificacion
     ${whereSql}
     ORDER BY fecha_envio DESC, id_notificacion DESC
     LIMIT ? OFFSET ?`,
    [...params, pagination.pageSize, pagination.offset]
  );

  return {
    items: rows,
    total: Number((countRows as { total: number }[])[0]?.total ?? 0),
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
}

export async function usuarioExists(id_usuario: number): Promise<boolean> {
  const [rows] = await pool.execute(
    "SELECT id_usuario FROM usuario WHERE id_usuario = ? LIMIT 1",
    [id_usuario]
  );

  return (rows as unknown[]).length > 0;
}

export async function countUnreadNotificaciones(id_usuario: number): Promise<number> {
  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS total FROM notificacion WHERE id_usuario = ? AND leido = FALSE",
    [id_usuario]
  );

  return Number((rows as { total: number }[])[0]?.total ?? 0);
}

export async function markNotificacionLeida(id_usuario: number, id_notificacion: number) {
  const [result] = await pool.execute(
    "UPDATE notificacion SET leido = TRUE WHERE id_notificacion = ? AND id_usuario = ?",
    [id_notificacion, id_usuario]
  );

  return result;
}

export async function markAllNotificacionesLeidas(id_usuario: number) {
  const [result] = await pool.execute(
    "UPDATE notificacion SET leido = TRUE WHERE id_usuario = ? AND leido = FALSE",
    [id_usuario]
  );

  return result;
}

export async function deleteNotificacion(id_usuario: number, id_notificacion: number) {
  const [result] = await pool.execute(
    "DELETE FROM notificacion WHERE id_notificacion = ? AND id_usuario = ?",
    [id_notificacion, id_usuario]
  );

  return result;
}
