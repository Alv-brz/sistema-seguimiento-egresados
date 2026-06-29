# AI_CONTEXT

Contexto tecnico permanente del proyecto. Toda sesion futura debe leer este archivo y `PROJECT_STATUS.md` antes de implementar cambios.

## Proyecto

Sistema de Seguimiento de Egresados y Bolsa Laboral para la Universidad de Huanuco (UDH).

El repositorio combina:

- Frontend React/Vite en `src/`.
- Backend REST Express/TypeScript en `backend/`.
- Base de datos MySQL documentada por scripts SQL en `Database/`.

La base de datos es la fuente de verdad del dominio. El frontend conserva algunos datos mock en pantallas no integradas, pero administrador, empresa y egresado ya consumen datos reales en sus flujos principales. Los roles Empresa y Egresado tienen escritura real aprobada en sus modulos propios.

## Tecnologias

Frontend:

- React 18.3.1.
- Vite 6.3.5.
- TypeScript/TSX.
- Tailwind CSS 4 mediante `@tailwindcss/vite`.
- Componentes base shadcn/ui y Radix UI en `src/app/components/ui/`.
- Iconos `lucide-react`.
- Graficos con `recharts`.
- Toasts con `sonner`, reutilizado mediante `FeedbackProvider` global.
- Estilos principalmente inline en `src/app/App.tsx`, mas CSS global en `src/styles/`.

Backend:

- Node.js con Express 4.
- TypeScript 5, modulo `NodeNext`, salida compilada en `backend/dist`.
- `tsx watch` para desarrollo.
- MySQL con `mysql2/promise`.
- JWT con `jsonwebtoken`.
- CORS con origen configurable.
- Variables de entorno con `dotenv`.

Base de datos:

- MySQL.
- Base: `seg_egresado_bolsa`.
- Scripts en `Database/` para esquema, datos, usuarios, vistas, funciones, procedimientos y triggers.

## Organizacion de Carpetas

Raiz:

- `package.json`: scripts del frontend (`npm run dev`, `npm run build`).
- `vite.config.ts`: configuracion Vite, React, Tailwind, alias `@ -> src`, resolver `figma:asset/*`.
- `README.md`: instrucciones originales del bundle Figma Make.
- `ATTRIBUTIONS.md`: atribuciones shadcn/ui y Unsplash.
- `default_shadcn_theme.css`: tema original.
- `AI_CONTEXT.md`: este documento.
- `PROJECT_STATUS.md`: estado historico y fases.

Frontend:

- `src/main.tsx`: monta React en `#root`.
- `src/app/App.tsx`: aplicacion principal, rutas internas por estado, pantallas por rol, UI, datos mock y navegacion.
- `src/app/App.tsx`: tambien contiene `FeedbackProvider`, sistema global de toasts via Sonner y modal propio de confirmacion.
- `src/app/auth.ts`: cliente de autenticacion contra el backend y persistencia de sesion en `localStorage`.
- `src/app/components/ui/`: componentes shadcn/ui/Radix disponibles.
- `src/app/components/figma/ImageWithFallback.tsx`: helper Figma.
- `src/styles/`: CSS global, tema, fuentes y Tailwind.

Backend:

- `backend/package.json`: scripts `dev`, `build`, `start`.
- `backend/tsconfig.json`: TypeScript estricto con `moduleResolution: NodeNext`.
- `backend/src/server.ts`: arranque HTTP.
- `backend/src/app.ts`: crea Express app, middlewares y rutas.
- `backend/src/config/env.ts`: carga y valida variables de entorno.
- `backend/src/config/db.ts`: pool MySQL.
- `backend/src/config/jwt.ts`: firma y verifica JWT.
- `backend/src/middleware/errorHandler.ts`: async handler y errores centralizados.
- `backend/src/modules/health/`: endpoint `GET /api/health`.
- `backend/src/modules/auth/`: login, middleware JWT, resolucion de roles y endpoint `GET /api/auth/me`.

Base de datos:

- `Database/Proyecto BD seguimiento egresado.sql`: crea la BD, tablas e inserts masivos.
- `Database/Usuarios.sql`: roles/usuarios MySQL y grants.
- `Database/Vistas.sql`: vistas de consulta.
- `Database/Funciones.sql`: funciones SQL.
- `Database/Procedimientos Almacenados.sql`: procedimientos CRUD/reportes.
- `Database/Triggers.sql`: auditoria.
- `Database/Triggers Signal.sql`: validaciones con `SIGNAL`.
- `Database/ConfiguracionSistema.sql`: tabla `configuracion_sistema`, insert inicial y triggers de validacion/auditoria.
- `Database/Modelos_bd.png`: modelo visual.

## Arquitectura Actual

El frontend es una SPA sin router externo. `App.tsx` mantiene `session` y `screen` en estado React. La pantalla activa se decide con un `switch` sobre un union type `Screen`.

La pantalla activa se persiste por rol en `localStorage` con keys `seg_egresado_bolsa.last_screen.<rol>`. Al refrescar la pagina con una sesion valida guardada, `App.tsx` restaura la ultima pantalla permitida para el rol autenticado; si el valor guardado no pertenece a `ROLE_SCREENS[role]`, vuelve al dashboard definido en `HOME_BY_ROLE`.

La SPA esta envuelta en `FeedbackProvider`, que centraliza mensajes y confirmaciones para todos los roles:

- Toasts reutilizables de exito, error, advertencia e informacion usando `sonner` instalado.
- Modal propio de confirmacion con botones `Cancelar` y `Confirmar`.
- Helper `unavailableCrudAction()` muestra toast informativo, no ventanas nativas.
- No se debe usar `alert()`, `confirm()` ni `prompt()` nativos del navegador.

Roles soportados:

- `admin`
- `empresa`
- `egresado`

Cada rol tiene:

- pantalla inicial en `HOME_BY_ROLE`.
- conjunto permitido en `ROLE_SCREENS`.
- menu lateral en `MENUS`.

El backend es una API REST modular bajo `/api`:

- `GET /api/health`: valida que el pool pueda ejecutar `SELECT 1 AS ok`.
- `POST /api/auth/login`: valida usuario/password contra MySQL.
- `GET /api/auth/me`: valida JWT Bearer y reconstruye la sesion desde MySQL.
- `GET /api/admin/dashboard`: resumen y graficos del administrador desde MySQL. Acepta filtros opcionales `facultad`, `carrera`, `anio` y `estadoLaboral` para Reportes y Estadisticas.
- `GET /api/admin/configuracion`: lee `configuracion_sistema` con `id_configuracion = 1`.
- `PUT /api/admin/configuracion`: actualiza parametros globales de `configuracion_sistema`.
- `GET /api/egresados`: listado de lectura para gestion admin de egresados.
- `POST /api/egresados`: crea usuario + egresado desde administrador.
- `PUT /api/egresados/:id`: actualiza usuario + egresado desde administrador.
- `PATCH /api/egresados/:id/estado`: desactiva o reactiva la cuenta del egresado cambiando `usuario.estado_usuario`; genera notificacion automatica para el usuario afectado.
- `DELETE /api/egresados/:id`: no elimina fisicamente; responde 405 e indica usar Desactivar para conservar el historial.
- `GET /api/empresas`: listado de lectura para gestion admin de empresas.
- `POST /api/empresas`: crea usuario + empresa desde administrador.
- `PUT /api/empresas/:id`: actualiza usuario + empresa desde administrador.
- `PATCH /api/empresas/:id/estado`: desactiva o reactiva la cuenta de la empresa cambiando `usuario.estado_usuario`; genera notificacion automatica para el usuario afectado.
- `DELETE /api/empresas/:id`: no elimina fisicamente; responde 405 e indica usar Desactivar para conservar ofertas e historial.
- `GET /api/ofertas`: listado de lectura para gestion admin de ofertas.
- `POST /api/ofertas`: crea una oferta desde administrador para una empresa activa.
- `PUT /api/ofertas/:id`: actualiza cualquier oferta desde administrador.
- `PATCH /api/ofertas/:id/estado`: cambia una oferta entre `Activa` y `Cerrada` desde administrador.
- `DELETE /api/ofertas/:id`: elimina oferta solo si no tiene postulaciones asociadas.
- `GET /api/encuestas`: listado de lectura para gestion admin de encuestas.
- `GET /api/auditoria`: listado de lectura para auditoria.
- `GET /api/notificaciones`: notificaciones del usuario autenticado.
- `GET /api/notificaciones/unread-count`: contador real de notificaciones no leidas del usuario autenticado.
- `PATCH /api/notificaciones/:id/leida`: marca como leida una notificacion del usuario autenticado.
- `PATCH /api/notificaciones/leer-todas`: marca como leidas todas las notificaciones del usuario autenticado.
- `POST /api/notificaciones`: crea una notificacion desde administrador. Si recibe `id_usuario`, la asigna a ese usuario destinatario; si no, la crea para el administrador autenticado.
- `DELETE /api/notificaciones/:id`: elimina una notificacion propia desde administrador.
- `GET /api/empresa/dashboard`: metricas y resumen de la empresa autenticada.
- `GET /api/empresa/ofertas`: ofertas de la empresa autenticada.
- `GET /api/empresa/postulaciones`: postulaciones recibidas por ofertas de la empresa autenticada.
- `GET /api/empresa/perfil`: datos reales de empresa + usuario de la empresa autenticada.
- `POST /api/empresa/ofertas`: publica una oferta para la empresa autenticada.
- `PUT /api/empresa/ofertas/:id`: edita una oferta propia de la empresa autenticada.
- `PATCH /api/empresa/ofertas/:id/cerrar`: cierra una oferta propia de la empresa autenticada y notifica automaticamente a los egresados postulantes.
- `PATCH /api/empresa/ofertas/:id/estado`: alterna una oferta propia entre `Activa` y `Cerrada` y notifica automaticamente a los egresados postulantes cuando corresponde.
- `DELETE /api/empresa/ofertas/:id`: elimina una oferta propia solo si no tiene postulaciones asociadas.
- `PATCH /api/empresa/postulaciones/:id/estado`: cambia estado de una postulacion asociada a oferta propia y notifica automaticamente al egresado postulante si pasa a `Pendiente`, `Aceptado` o `Rechazado`.
- `PUT /api/empresa/perfil`: actualiza datos propios de empresa y correo de usuario.
- `GET /api/egresado/dashboard`: resumen del egresado autenticado.
- `GET /api/egresado/bolsa`: ofertas activas disponibles para egresados.
- `GET /api/egresado/postulaciones`: postulaciones del egresado autenticado.
- `GET /api/egresado/perfil`: datos reales de usuario + egresado + carrera + facultad.
- `GET /api/egresado/historial`: historial laboral del egresado autenticado.
- `GET /api/egresado/encuesta`: ultima encuesta asociada al egresado autenticado.
- `GET /api/egresado/carreras`: catalogo de carreras activas para el perfil del egresado y formularios admin de egresados.
- `POST /api/egresado/postulaciones`: registra postulacion del egresado autenticado a una oferta activa y vigente.
- `PUT /api/egresado/perfil`: actualiza datos propios de `usuario` y `egresado`.
- `POST /api/egresado/historial`: crea historial laboral propio.
- `PUT /api/egresado/historial/:id`: edita historial laboral propio.
- `DELETE /api/egresado/historial/:id`: elimina historial laboral propio.
- `POST /api/egresado/encuesta`: registra encuesta de seguimiento y la asocia al egresado autenticado.
- `GET /api/admin/sql-evidencias`: devuelve la matriz de cumplimiento y metadatos de vistas, funciones, procedimientos, triggers y roles MySQL existentes en `Database/`.
- `GET /api/admin/sql-evidencias/vistas/:name`: consulta resultados reales de una vista permitida por lista blanca.
- `POST /api/admin/sql-evidencias/funciones/:name/run`: ejecuta una función SQL permitida con parámetros de prueba controlados.
- `POST /api/admin/sql-evidencias/procedimientos/:name/run`: ejecuta un procedimiento permitido; las escrituras usan datos temporales dentro de transacciones con `ROLLBACK`.
- `GET /api/admin/sql-evidencias/auditoria/reciente`: muestra registros recientes de `auditoria`.
- `POST /api/admin/sql-evidencias/auditoria/probar`: genera evidencia temporal de auditoría para los triggers operativos dentro de una transacción revertida.
- `POST /api/admin/sql-evidencias/signal/:name/test`: provoca de forma controlada un trigger `SIGNAL` permitido y devuelve su mensaje.
- `GET /api/admin/sql-evidencias/roles`: muestra los 3 roles MySQL definidos en `Database/Usuarios.sql` y explica que el aplicativo usa JWT + `requireRole`.

Los endpoints de lectura inicial estan implementados para pantallas de administrador, empresa y egresado. El CRUD de Empresa ya esta cerrado para publicar, editar, cerrar, reactivar y eliminar ofertas propias, cambiar estado de postulaciones propias y actualizar perfil propio. El CRUD de Egresado ya esta cerrado para postulaciones, perfil, historial laboral, encuesta de seguimiento y notificaciones. CRUD Administrador Fase B esta implementado para egresados, empresas, ofertas, encuestas historicas y notificaciones administrables. La gestion de encuestas de administrador es solo lectura/detalle: las encuestas respondidas forman parte del historial del egresado y no se eliminan. La fase de eventos automaticos y notificaciones del sistema esta implementada: cambios de postulacion, cierre/reactivacion de ofertas, desactivacion/reactivacion de cuentas y disponibilidad de encuesta generan notificaciones reales en `notificacion`, con deduplicacion por usuario, titulo y mensaje. El flujo de lectura de notificaciones fue estabilizado para validar la sesion guardada con `/api/auth/me`, listar solo el usuario autenticado, no mostrar fallback mock cuando existe API real, normalizar `leido` y aceptar filtros `leidas/no leidas` con o sin tilde.

## Flujo Frontend/Backend

1. Al cargar, si existe sesion en `localStorage`, el frontend la valida contra `GET /api/auth/me`; si el token expiro, es invalido o el rol ya no coincide, elimina la sesion local y vuelve a `LoginScreen`.
2. `src/app/auth.ts` llama a `POST {VITE_API_URL}/auth/login`.
3. Si el backend devuelve `{ ok: true, session }`, el frontend guarda la sesion en `localStorage` con key `seg_egresado_bolsa.session`.
4. `App.tsx` asigna la pantalla inicial segun el rol.
5. Si la pagina se refresca con sesion activa, `App.tsx` restaura la ultima pantalla valida del rol desde `localStorage`; si no es valida, usa el dashboard del rol.
6. La navegacion se hace con `setScreen`, que valida permisos mediante `canAccessScreen` y guarda la pantalla valida por rol.
7. El logout elimina la sesion local y vuelve al login.

Valor por defecto de `VITE_API_URL`:

- `http://localhost:3001/api`

Valor por defecto de CORS en backend:

- `FRONTEND_ORIGIN=http://localhost:5173`

Para futuras llamadas autenticadas, usar:

- Header `Authorization: Bearer <session.token>`.
- El token ya queda disponible en `AuthSession.token`.

La capa frontend reutilizable esta en `src/app/api.ts`:

- Centraliza `VITE_API_URL`.
- Lee el token desde `readStoredSession()`.
- Envia `Authorization: Bearer <token>` cuando existe sesion.
- Expone `adminApi` para dashboard, egresados, empresas, ofertas, encuestas, auditoria y notificaciones.
- Expone `empresaApi` para dashboard, ofertas, postulaciones, perfil y notificaciones de empresa.
- Expone `egresadoApi` para dashboard, bolsa laboral, postulaciones, perfil, historial, encuesta y notificaciones de egresado.
- Expone `notificacionesNoLeidas` para administrador, empresa y egresado mediante `GET /api/notificaciones/unread-count`.
- Las pantallas admin usan datos reales con fallback a los mocks locales si la API no esta disponible.
- Las pantallas empresa usan datos reales filtrados por el `id_usuario` del JWT.
- Las pantallas egresado usan datos reales filtrados por el `id_usuario` del JWT.
- Los listados admin consumen respuestas paginadas `{ items, total, page, pageSize }`.
- Los buscadores y filtros visibles en listados grandes se envian como query params al backend y deben resetear la pagina a 1 al cambiar.
- Los listados admin con busqueda real son egresados, empresas, ofertas, encuestas, auditoria y notificaciones.
- Los listados empresa con busqueda real son mis ofertas y postulaciones recibidas.
- Los listados egresado con busqueda real son bolsa laboral, mis postulaciones e historial laboral.
- Filtros utiles actuales: egresados por carrera/estado de usuario; empresas por sector/estado de usuario; ofertas por estado/modalidad; postulaciones por estado; encuestas por estado laboral; auditoria por accion/tabla afectada; notificaciones por todas/leidas/no leidas; historial laboral por actual/no actual.
- La pantalla Dashboard de administrador consume `/api/admin/dashboard` sin filtros y no debe usar textos tecnicos visibles en KPIs o titulos de graficos.
- La pantalla Reportes y Estadisticas consume `/api/admin/dashboard` con filtros aplicados por boton: facultad, carrera, anio y estado laboral. Los KPIs y graficos deben actualizarse con la respuesta filtrada y mostrar estado vacio si no hay datos.

## Modelo de Autenticacion

Frontend:

- Archivo: `src/app/auth.ts`.
- Tipos: `AuthRole`, `AuthSession`, `AuthResult`.
- Credenciales demo:
  - admin: `admin.general001` / `Admin123*`
  - empresa: `finanzasugartes14768` / `%0r1MFj6Qp`
  - egresado: `bartolomé.vicente85683` / `&19LW%iOD&`
- La sesion guardada debe cumplir:
  - `id_usuario: number`
  - `nombre_usuario: string`
  - `role: "admin" | "empresa" | "egresado"`
  - `token: string`

Backend:

- `auth.service.ts` consulta tabla `usuario`.
- Password actual en texto plano, porque la BD actual lo almacena asi. No introducir bcrypt sin una fase explicita de migracion de datos.
- Usuarios inactivos devuelven `inactive`.
- Usuario o password incorrecto devuelven `invalid`.
- El rol se resuelve por pertenencia de `id_usuario` a:
  - `administrador`
  - `empresa`
  - `egresado`
- Orden de resolucion: administrador > empresa > egresado.
- JWT payload minimo:
  - `id_usuario`
  - `role`
- `GET /api/auth/me` reconstruye sesion desde MySQL y valida que el rol del token coincida.

## Conexion MySQL

Configuracion en `backend/src/config/env.ts`:

- `PORT`, default `3001`.
- `FRONTEND_ORIGIN`, default `http://localhost:5173`.
- `DB_HOST`, default `localhost`.
- `DB_PORT`, default `3306`.
- `DB_USER`, default `admin_general`.
- `DB_PASSWORD`, requerida.
- `DB_NAME`, default `seg_egresado_bolsa`.
- `DB_CONNECTION_LIMIT`, default `10`.
- `JWT_SECRET`, requerida.
- `JWT_EXPIRES_IN`, default `8h`.

Pool en `backend/src/config/db.ts`:

- `mysql.createPool`.
- `decimalNumbers: true`.
- `dateStrings: true`.
- `charset: "utf8mb4"`.
- usuario esperado: `admin_general`, definido en `Database/Usuarios.sql`.

## Modelo de Datos Principal

Tablas principales detectadas en `Database/Proyecto BD seguimiento egresado.sql`:

- `usuario`
- `administrador`
- `facultad`
- `carrera`
- `egresado`
- `empresa`
- `historial_laboral`
- `encuesta_seguimiento`
- `seguimiento_egresado`
- `oferta_laboral`
- `postulacion`
- `auditoria`
- `notificacion`
- `recuperacion_password`
- `configuracion_sistema`

Vistas:

- `vw_egresados_carrera_facultad`
- `vw_empresa_ofertas`
- `vw_postulaciones_completas`
- `vw_historial_laboral_completo`
- `vw_encuestas_egresados`
- `vw_egresados_empleados`
- `vw_ofertas_activas`
- `vw_cantidad_ofertas_empresa`
- `vw_postulaciones_por_oferta`
- `vw_promedio_salarial_carrera`

Funciones:

- `fn_total_postulaciones`
- `fn_total_ofertas_empresa`
- `fn_promedio_salario`
- `fn_nombre_completo`
- `fn_nombre_carrera`
- `fn_nombre_empresa`
- `fn_total_egresados_carrera`
- `fn_total_encuestas`
- `fn_estado_laboral_actual`
- `fn_ultima_empresa`

Procedimientos:

- `sp_registrar_empresa`
- `sp_actualizar_empresa`
- `sp_registrar_egresado`
- `sp_actualizar_egresado`
- `sp_cambiar_estado_egresado_seguro`
- `sp_cambiar_estado_empresa_seguro`
- `sp_publicar_oferta`
- `sp_actualizar_oferta`
- `sp_cerrar_oferta`
- `sp_registrar_postulacion`
- `sp_cambiar_estado_postulacion`
- `sp_registrar_encuesta`
- `sp_asociar_encuesta_egresado`
- `sp_postulaciones_por_empresa`
- `sp_egresados_por_carrera`

## Modulos Existentes

Frontend funcional:

- Login por rol.
- Dashboard administrador.
- Gestion de egresados.
- Gestion de empresas.
- Gestion de ofertas laborales.
- Gestion de encuestas.
- Reportes y estadisticas.
- Auditoria.
- Configuracion.
- Dashboard empresa.
- Crear oferta.
- Postulaciones recibidas.
- Perfil empresa.
- Dashboard egresado.
- Bolsa laboral.
- Mis postulaciones.
- Encuesta de seguimiento.
- Mi perfil.
- Historial laboral.
- Notificaciones.

Backend implementado:

- `health`: verificacion de API y DB.
- `auth`: login, JWT, middleware de autorizacion y reconstruccion de sesion.
- `admin-dashboard`: metricas y graficos de lectura para admin.
- `admin-configuracion`: lectura y actualizacion de `configuracion_sistema`.
- `egresados`: listado admin de egresados con usuario, carrera y facultad.
- `empresas`: listado admin de empresas con correo/estado de usuario.
- `ofertas`: listado admin de ofertas con razon social de empresa.
- `encuestas`: listado admin de encuestas asociadas a egresados.
- `auditoria`: lectura de tabla `auditoria`.
- `notificaciones`: lectura de notificaciones y contador real de no leidas del usuario autenticado.
- `admin-sql-evidencias`: matriz y panel académico de demostración SQL solo para administrador; no expone SQL libre y usa listas blancas.
- `empresa`: dashboard, ofertas propias, postulaciones recibidas y perfil de la empresa autenticada.
- `egresado`: dashboard, bolsa laboral, postulaciones propias, perfil, historial, ultima encuesta y escrituras propias del egresado autenticado.
- `utils/pagination`: normalizacion de `page`, `pageSize` y filtros de query.

Backend pendiente:

- Modulos REST para reportes especificos no cubiertos por dashboard.
- Escrituras de Administrador Fase B no cubiertas por la Fase A.
- Reportes especificos fuera de dashboard.
- Validaciones de entrada formales para modulos pendientes fuera de Empresa y Egresado.
- Manejo de permisos por entidad fuera de los CRUD Empresa y Egresado ya implementados.

## Convenciones de Codigo

Frontend:

- Mantener TypeScript estricto y tipos union para roles/pantallas.
- Reutilizar `AuthRole` y `AuthSession` desde `src/app/auth.ts`.
- Mantener proteccion de pantallas con `ROLE_SCREENS`.
- No romper la estructura visual importada de Figma.
- Los estilos actuales estan mayormente inline en `App.tsx`; no migrar a otro sistema sin fase aprobada.
- Si se agregan llamadas API, concentrar helpers de autenticacion/API en archivos dedicados, no duplicar `fetch` con URLs hardcodeadas por toda la UI.
- Mantener `VITE_API_URL` como base configurable.
- En pantallas admin, mantener fallback local a mocks mientras no exista manejo visual de errores/carga.
- En pantallas empresa, nunca usar ids hardcodeados para consultar datos; filtrar siempre por `res.locals.auth.id_usuario`.
- En pantallas egresado, nunca usar ids hardcodeados para consultar datos personales; filtrar siempre por `res.locals.auth.id_usuario`.
- En listados admin, usar paginacion real desde backend para evitar cargar miles de filas.
- Los botones de acciones aun no implementadas deben mostrar `Función disponible en la fase de CRUD.` y no ejecutar escrituras locales/remotas.
- Los mensajes al usuario deben usar el sistema global de toasts (`useFeedback().toast` o `notifySystem` en helpers no React).
- Las confirmaciones deben usar el modal propio global (`useFeedback().requestConfirmation`).
- No introducir `alert()`, `confirm()` ni `prompt()` nativos; toda captura debe hacerse con formularios, modales o dialogos propios.

Backend:

- TypeScript estricto.
- ESM con imports que incluyen extension `.js` en codigo TS cuando importa archivos locales, por compatibilidad `NodeNext`.
- Separar por modulo: `*.routes.ts`, `*.controller.ts`, `*.service.ts`, middleware si aplica.
- Usar `asyncHandler` para controladores async.
- Usar consultas parametrizadas con `pool.execute` o `pool.query`, nunca interpolar valores del usuario en SQL.
- Errores de DB deben pasar por `errorHandler`.
- Responder JSON uniforme con `ok`.
- Usar `requireAuth` y `requireRole` en rutas protegidas.
- Las fases de lectura solo permiten `SELECT`; la excepcion aprobada es CRUD Empresa para ofertas, postulaciones propias y perfil propio.
- Los endpoints de listados devuelven objetos paginados con `items`, `total`, `page` y `pageSize`.
- Mantener buscadores server-side en listados grandes usando campos relevantes y consultas parametrizadas; no filtrar solo en frontend cuando existe endpoint real.
- Para CRUD Empresa, toda escritura debe usar `res.locals.auth.id_usuario` y validar propiedad con `WHERE ... id_empresa = ?` o joins equivalentes.

Base de datos:

- Tratar `Database/` como fuente de verdad y artefacto protegido.
- No modificar scripts SQL existentes sin aprobacion explicita.
- Preferir vistas y procedimientos existentes cuando calcen con la necesidad.
- Respetar triggers de validacion y auditoria; no duplicar reglas contradictorias en backend.

## Restricciones Permanentes

- Antes de cualquier cambio, leer `AI_CONTEXT.md` y `PROJECT_STATUS.md`.
- Despues de completar una fase, actualizar ambos documentos.
- No modificar `Database/` salvo instruccion explicita del usuario.
- No alterar el diseno Figma/base visual de la aplicacion salvo instruccion explicita.
- No eliminar plugins obligatorios de `vite.config.ts`: React y Tailwind son requeridos por Make.
- No agregar `.css`, `.tsx` ni `.ts` a `assetsInclude`.
- No cambiar el modelo de password a bcrypt sin migracion aprobada de datos.
- No hacer resets destructivos de git ni revertir cambios no propios.
- No cambiar credenciales demo sin verificar que existan en la BD.
- No asumir que los datos mock son persistentes; son representaciones alineadas al esquema hasta que existan endpoints.
- Mantener compatibilidad con MySQL `utf8mb4` por nombres y textos con acentos.

## Decisiones Tecnicas Tomadas

- Backend separado dentro de `backend/`, no integrado al servidor Vite.
- API bajo prefijo `/api`.
- CORS restringido a `FRONTEND_ORIGIN`.
- MySQL se accede mediante pool unico `mysql2/promise`.
- Autenticacion inicial contra tabla `usuario`.
- Passwords en texto plano por compatibilidad con la BD actual.
- JWT incluye solo `id_usuario` y `role`.
- Roles de aplicacion se resuelven por tablas hijas, no por campo directo en `usuario`.
- El frontend guarda la sesion en `localStorage`.
- Las rutas internas del frontend son estado local, no React Router.
- La ultima pantalla valida se guarda por rol en `localStorage`; no introducir React Router solo para restaurar pantalla al refrescar.
- La aplicacion usa `FeedbackProvider` en la raiz para mensajes globales y confirmaciones propias; `sonner` se reutiliza para toasts con estilos personalizados del sistema.
- Los datos de las pantallas siguen mock hasta que se implemente cada modulo REST.
- Las pantallas de administrador ya consumen datos reales de MySQL para dashboard, egresados, empresas, ofertas, encuestas, auditoria y notificaciones.
- Los listados admin usan paginacion real con `LIMIT/OFFSET` y filtros server-side.
- Las pantallas de empresa ya consumen datos reales de MySQL para dashboard, mis ofertas, postulaciones recibidas, perfil y notificaciones.
- Las consultas de empresa filtran siempre por el `id_usuario` obtenido del JWT, que corresponde a `empresa.id_usuario`.
- El CRUD de empresa usa SQL directo parametrizado porque los procedimientos existentes no cubren todos los campos del formulario. `sp_cerrar_oferta` existe, pero se usa `UPDATE ... WHERE id_empresa = ?` para detectar `affectedRows` y devolver 404 si la oferta no es propia.
- La eliminacion de ofertas de empresa valida propiedad por `id_empresa` y bloquea con HTTP 409 si existen postulaciones asociadas; no elimina postulaciones.
- La eliminacion de ofertas desde administrador tambien bloquea con HTTP 409 si existen postulaciones asociadas y devuelve el mensaje: `No se puede eliminar una oferta con postulaciones asociadas. Puede cerrarla.`
- La gestion admin de egresados y empresas mantiene eliminacion solo si MySQL lo permite, pero la alternativa principal para registros con historial es desactivar/reactivar la cuenta actualizando `usuario.estado_usuario`.
- La gestion admin de encuestas no muestra ni expone eliminacion; solo permite ver detalle porque las respuestas forman parte del historial del egresado.
- La gestion admin de ofertas permite crear ofertas para empresas activas, editar, cerrar/reactivar y eliminar solo si no existen postulaciones asociadas.
- La gestion admin de notificaciones permite crear, listar, ver, buscar, filtrar, marcar como leida y eliminar notificaciones. La creacion puede ser propia o dirigida a un `id_usuario` destinatario desde backend. Empresa y Egresado solo pueden listar/marcar sus propias notificaciones.
- La pantalla `Mis Ofertas` de empresa edita ofertas con modal/formulario completo, no con `prompt()`, y permite alternar `Activa`/`Cerrada` desde la tabla.
- Estados permitidos al cambiar postulaciones desde empresa: `Pendiente`, `Aceptado`, `Rechazado`. No usar `En Proceso` para nuevas actualizaciones.
- Las pantallas de egresado ya consumen datos reales de MySQL para dashboard, bolsa laboral, mis postulaciones, perfil, historial laboral, encuesta y notificaciones.
- Las consultas personales de egresado filtran siempre por el `id_usuario` obtenido del JWT, que corresponde a `egresado.id_usuario`.
- Las escrituras de egresado usan siempre `res.locals.auth.id_usuario`; el frontend no envia ni decide `id_egresado`.
- El CRUD de egresado usa SQL directo parametrizado donde los procedimientos existentes no cubren todos los campos visibles. `sp_registrar_postulacion`, `sp_actualizar_egresado`, `sp_registrar_encuesta` y `sp_asociar_encuesta_egresado` se revisaron, pero no cubren todos los campos requeridos por los formularios actuales.
- La postulacion valida oferta existente, estado `Activa`, fecha de cierre vigente y duplicados antes del `INSERT`.
- Perfil egresado valida correo, DNI de 8 digitos, sexo `M/F`, fecha de egreso no futura y carrera valida.
- Historial laboral valida salario no negativo, fechas coherentes y propiedad por `id_egresado`.
- Encuesta de seguimiento respeta `configuracion_sistema.tiempo_entre_encuestas_meses`; `0` permite responder inmediatamente.
- Notificaciones permite marcar una o todas como leidas para el usuario autenticado y actualiza el contador real del badge.
- Las notificaciones automaticas se crean desde backend con helpers en `backend/src/modules/notificaciones/notificaciones.service.ts`; siempre se asignan al `id_usuario` destinatario. Para eventos operativos como postulaciones, cierre/reactivacion de ofertas y activacion/desactivacion de cuentas, la deduplicacion bloquea solo si una notificacion equivalente por `id_usuario + titulo + mensaje` fue creada en los ultimos 30 segundos y sigue siendo la ultima notificacion del usuario; si hubo un evento intermedio, el mismo texto puede volver a notificarse como evento legitimo. La ventana se calcula en MySQL con `DATE_SUB(NOW(), INTERVAL ? SECOND)` y la decision se serializa con `GET_LOCK` para proteger dobles peticiones concurrentes. Para encuesta disponible, la deduplicacion usa la encuesta vigente como clave de evento: el mensaje incluye `Referencia: <id_encuesta>` y se bloquea solo si ya existe esa misma notificacion de encuesta, permitiendo una nueva disponibilidad legitima aunque ocurra el mismo dia.
- `GET /api/notificaciones` y `GET /api/notificaciones/unread-count` siempre usan `res.locals.auth.id_usuario`; no aceptan ids enviados por cliente para listar o contar. Los filtros de notificaciones aceptan `Todas`, `Leidas/Leídas` y `No leidas/No leídas`, y el listado devuelve `leido` normalizado como `0` o `1`.
- La pantalla frontend de Notificaciones no usa datos mock como fallback cuando `useApi=true`; si el endpoint falla, no sustituye la respuesta por otro estado local. El contador del sidebar y el listado se refrescan desde los mismos endpoints reales despues de marcar una o todas como leidas.
- QA Final corrigio detalles pequenos de interfaz sin cambiar arquitectura: el sidebar/topbar muestran el `nombre_usuario` de la sesion real en vez de nombres demo fijos, el titulo superior de Empresa muestra `Mis Ofertas` cuando reutiliza la pantalla interna `admin-ofertas`, los enlaces de pagina web de empresas ya apuntan a una URL real y los botones visuales dentro de formularios usan `type="button"` para no disparar guardados involuntarios.
- La revision final UTF-8 confirmo que la BD trabaja con `utf8mb4` y que backend/frontend devuelven acentos correctamente por HTTP. No se encontro un problema general de encoding; los hallazgos fueron registros puntuales de prueba creados desde consola/PowerShell con caracteres reemplazados (`?` o `�`), corregidos directamente como datos usando valores Unicode correctos sin modificar scripts de `Database/`.
- La pantalla de recuperacion de contrasena no tiene backend ni envio de correo implementado; por QA Final ya no simula exito ni muestra campos tecnicos como `fecha_expiracion`. Debe considerarse pendiente real si se exige recuperacion automatica antes de entrega.
- Las acciones admin cubiertas por Fase A usan escrituras reales; acciones fuera de Fase A, como exportaciones/reportes pendientes, siguen mostrando aviso hasta una fase aprobada.
- El badge rojo del menu de notificaciones usa el contador real de no leidas y se oculta cuando el contador es 0.
- Los errores SQL `SIGNAL` se traducen a HTTP 422, duplicados a 409 e integridad referencial a 409.
- El panel `Evidencias SQL` esta disponible solo para rol administrador. Usa endpoints controlados bajo `/api/admin/sql-evidencias`, consulta objetos reales definidos en `Database/`, no modifica scripts SQL, no crea tablas y no permite SQL arbitrario desde frontend.
- Las pruebas de procedimientos de escritura, auditoria y SIGNAL usan datos temporales y transacciones revertidas con `ROLLBACK` para no dañar datos reales. La auditoria reciente se muestra desde la tabla `auditoria`.
- Los objetos SQL avanzados ya no quedan solo en `Evidencias SQL`: vistas, funciones y procedimientos seguros se consumen tambien desde endpoints operativos. Las vistas alimentan listados/reportes (`egresados`, `ofertas`, `postulaciones`, `historial`, `encuestas`, `dashboard`). Las funciones alimentan KPIs y nombres calculados. Los procedimientos no destructivos se invocan con `CALL` en flujos reales y se complementan con SQL parametrizado cuando no cubren todos los campos actuales.
- Procedimientos integrados con `CALL` en flujos reales y mostrados en `Evidencias SQL`: `sp_registrar_empresa`, `sp_actualizar_empresa`, `sp_registrar_egresado`, `sp_actualizar_egresado`, `sp_cambiar_estado_egresado_seguro`, `sp_cambiar_estado_empresa_seguro`, `sp_publicar_oferta`, `sp_actualizar_oferta`, `sp_cerrar_oferta`, `sp_registrar_postulacion`, `sp_cambiar_estado_postulacion`, `sp_registrar_encuesta`, `sp_asociar_encuesta_egresado`, `sp_postulaciones_por_empresa` y `sp_egresados_por_carrera`.
- El modulo `Evidencias SQL` muestra unicamente objetos del flujo operativo real: 10 vistas, 10 funciones, 15 procedimientos, 10 triggers de auditoria, 15 triggers SIGNAL y 3 roles MySQL. Cada fila incluye nombre, tipo, endpoint, archivo backend y flujo real.
- Los procedimientos seguros `sp_cambiar_estado_egresado_seguro` y `sp_cambiar_estado_empresa_seguro`, y los triggers `tr_estado_usuario_update_signal`, `tr_aud_usuario_estado_update` y `tr_aud_historial_laboral_delete`, ya existen en MySQL y se usan desde endpoints reales.
- Scripts nuevos de integracion SQL: `Database/IntegracionObjetosSQL_Final.sql` y carpeta `Database/Entrega_Limpia_SQL/` con scripts limpios por categoria. Los scripts antiguos de `Database/` permanecen sin modificaciones.
- `configuracion_sistema` es singleton con `id_configuracion = 1`; sus validaciones de correo, meses y estado dependen de triggers `SIGNAL`.
- La UI no debe mostrar etiquetas tecnicas SQL, tipos de columna ni nombres internos como ayuda de usuario. Usar etiquetas amigables como Titulo, Descripcion, Puesto, Area, Ubicacion, Modalidad, Tipo de contrato, Salario, Requisitos, Fecha de cierre, Correo, Telefono, Direccion, DNI, Sexo, Facultad, Carrera y Estado.
- Las ayudas visibles deben ser orientadas al usuario, por ejemplo maximos de caracteres, campo obligatorio/opcional, disponibilidad inmediata con `0` meses o validaciones de fecha.

## Protocolo Para Futuras Fases

1. Leer `AI_CONTEXT.md`.
2. Leer `PROJECT_STATUS.md`.
3. Confirmar la fase pendiente o solicitada.
4. Implementar cambios pequenos y coherentes con la arquitectura.
5. Verificar con build/test disponible.
6. Actualizar `AI_CONTEXT.md` si cambio la arquitectura, convenciones, endpoints o restricciones.
7. Actualizar `PROJECT_STATUS.md` con fase, archivos modificados y proxima recomendacion.
