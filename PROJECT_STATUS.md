# PROJECT_STATUS

Estado permanente del proyecto. Toda sesion futura debe leer este archivo y `AI_CONTEXT.md` antes de implementar cambios.

## Resumen Actual

El proyecto tiene una SPA React/Vite funcional visualmente para tres roles (`admin`, `empresa`, `egresado`) y un backend Express/TypeScript con conexion MySQL, health check y autenticacion real contra la tabla `usuario`.

La mayor parte de las pantallas del frontend aun usa datos mock definidos en `src/app/App.tsx`, aunque los nombres de tablas/campos estan alineados con el esquema SQL de `Database/`.

Estado aprobado al 2026-06-26:

- Base de datos existente en scripts SQL y no debe modificarse sin aprobacion explicita.
- Backend creado en `backend/`.
- Fase de conexion a MySQL implementada.
- Fase de autenticacion implementada.
- Frontend conectado al endpoint de login.
- Documentacion tecnica permanente creada en raiz.
- Capa base de consumo API creada.
- Pantallas de administrador conectadas a endpoints reales de lectura MySQL.

## Fases Implementadas

### Fase 0 - Base Frontend Figma/React

Estado: implementada antes de esta documentacion.

Incluye:

- SPA React con UI completa.
- Menus por rol.
- Pantallas principales de administracion, empresa y egresado.
- Datos mock alineados al modelo `seg_egresado_bolsa`.
- Componentes shadcn/ui disponibles.
- Configuracion Vite/Tailwind.

Archivos importantes:

- `src/main.tsx`
- `src/app/App.tsx`
- `src/app/components/ui/*`
- `src/styles/*`
- `vite.config.ts`
- `package.json`

### Fase 1 - Backend Base y Conexion MySQL

Estado: implementada antes de esta documentacion.

Incluye:

- Proyecto backend Node/Express/TypeScript en `backend/`.
- Configuracion de entorno.
- Pool MySQL con `mysql2/promise`.
- Middleware CORS, JSON y logs.
- Health endpoint `GET /api/health`.
- Error handler centralizado.

Archivos importantes:

- `backend/package.json`
- `backend/tsconfig.json`
- `backend/src/server.ts`
- `backend/src/app.ts`
- `backend/src/config/env.ts`
- `backend/src/config/db.ts`
- `backend/src/middleware/errorHandler.ts`
- `backend/src/modules/health/health.routes.ts`
- `backend/src/modules/health/health.controller.ts`
- `backend/src/modules/health/health.service.ts`

### Fase 2 - Autenticacion Real

Estado: implementada antes de esta documentacion.

Incluye:

- Login contra tabla `usuario`.
- Validacion de usuario activo.
- Resolucion de rol por tablas `administrador`, `empresa`, `egresado`.
- JWT con `id_usuario` y `role`.
- Middleware `requireAuth` y `requireRole`.
- Endpoint `GET /api/auth/me`.
- Frontend usando `POST /api/auth/login`.
- Persistencia de sesion en `localStorage`.
- Credenciales demo por rol.

Archivos importantes:

- `src/app/auth.ts`
- `src/app/App.tsx`
- `backend/src/config/jwt.ts`
- `backend/src/modules/auth/auth.routes.ts`
- `backend/src/modules/auth/auth.controller.ts`
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/modules/auth/auth.middleware.ts`

### Fase 3 - Documentacion Permanente para IA

Estado: implementada en esta sesion.

Incluye:

- Creacion de `AI_CONTEXT.md`.
- Creacion de `PROJECT_STATUS.md`.
- Regla permanente: leer ambos archivos antes de implementar.
- Regla permanente: actualizar ambos archivos al cerrar cada fase.

Archivos modificados:

- `AI_CONTEXT.md`
- `PROJECT_STATUS.md`

### Fase 4 - Capa API y Lectura Real para Administrador

Estado: implementada en esta sesion.

Incluye:

- Cliente API frontend reutilizable en `src/app/api.ts`.
- Envio automatico de JWT Bearer desde la sesion guardada.
- Endpoints backend protegidos con `requireAuth` y `requireRole`.
- Endpoints de solo lectura para dashboard admin, egresados, empresas, ofertas, encuestas, auditoria y notificaciones.
- Sustitucion de mocks por datos reales de MySQL solo en pantallas de administrador.
- Empresa y egresado conservan comportamiento mock.
- No se implementaron INSERT, UPDATE, DELETE ni CRUD.
- No se modifico `Database/`.
- Listados iniciales limitados a 500 filas hasta implementar paginacion real.

Archivos creados:

- `src/app/api.ts`
- `backend/src/modules/admin-dashboard/admin-dashboard.routes.ts`
- `backend/src/modules/admin-dashboard/admin-dashboard.controller.ts`
- `backend/src/modules/admin-dashboard/admin-dashboard.service.ts`
- `backend/src/modules/egresados/egresados.routes.ts`
- `backend/src/modules/egresados/egresados.controller.ts`
- `backend/src/modules/egresados/egresados.service.ts`
- `backend/src/modules/empresas/empresas.routes.ts`
- `backend/src/modules/empresas/empresas.controller.ts`
- `backend/src/modules/empresas/empresas.service.ts`
- `backend/src/modules/ofertas/ofertas.routes.ts`
- `backend/src/modules/ofertas/ofertas.controller.ts`
- `backend/src/modules/ofertas/ofertas.service.ts`
- `backend/src/modules/encuestas/encuestas.routes.ts`
- `backend/src/modules/encuestas/encuestas.controller.ts`
- `backend/src/modules/encuestas/encuestas.service.ts`
- `backend/src/modules/auditoria/auditoria.routes.ts`
- `backend/src/modules/auditoria/auditoria.controller.ts`
- `backend/src/modules/auditoria/auditoria.service.ts`
- `backend/src/modules/notificaciones/notificaciones.routes.ts`
- `backend/src/modules/notificaciones/notificaciones.controller.ts`
- `backend/src/modules/notificaciones/notificaciones.service.ts`

Archivos modificados:

- `backend/src/app.ts`
- `src/app/App.tsx`
- `AI_CONTEXT.md`
- `PROJECT_STATUS.md`

## Funcionalidades Terminadas

- Aplicacion frontend arranca con Vite.
- Layout principal con sidebar, top nav y pantallas por rol.
- Control local de acceso a pantallas por rol.
- Login real contra backend.
- Persistencia local de sesion.
- Logout.
- Backend Express inicial.
- Conexion MySQL mediante pool.
- Health check de API/DB.
- Generacion y verificacion de JWT.
- Middleware de autenticacion/autorizacion.
- Manejo centralizado de errores comunes de MySQL.
- Documentacion tecnica permanente.
- Cliente API frontend reutilizable.
- Dashboard administrador con metricas/graficos reales desde MySQL.
- Gestion de egresados con datos reales desde MySQL.
- Gestion de empresas con datos reales desde MySQL.
- Gestion de ofertas con datos reales desde MySQL.
- Gestion de encuestas con datos reales desde MySQL.
- Auditoria con datos reales desde MySQL.
- Notificaciones de administrador desde MySQL.

## Funcionalidades Pendientes

- Consumir `GET /api/auth/me` al iniciar para validar sesion contra backend.
- Reemplazar datos mock por endpoints reales en pantallas de empresa y egresado.
- Endpoints backend para postulaciones.
- Endpoints backend para historial laboral.
- Endpoints backend para reportes.
- Paginacion, busqueda y filtros desde backend.
- Validacion de entrada por modulo.
- Proteccion de permisos por rol y por propietario del recurso.
- Manejo formal de variables `.env` y documentacion de ejemplo si falta.
- Pruebas automatizadas o checks de integracion.

## Fases Pendientes Recomendadas

### Fase 5 - Validacion de Sesion y Paginacion Admin

Objetivo:

- Validar sesion con `GET /api/auth/me` al cargar la app.
- Manejar token invalido expirado cerrando sesion.
- Agregar paginacion, busqueda y filtros desde backend para listados admin.
- Mantener endpoints de solo lectura.

Archivos probables:

- `src/app/auth.ts`
- `src/app/api.ts`
- `src/app/App.tsx`
- servicios backend de listados admin

### Fase 6 - Lectura Real para Empresa y Egresado

Objetivo:

- Implementar endpoints GET para reemplazar mocks de bajo riesgo en empresa y egresado.
- Prioridad sugerida: ofertas por empresa, postulaciones por empresa, perfil empresa, bolsa laboral, postulaciones del egresado e historial laboral.
- Preferir vistas existentes cuando correspondan.

Archivos probables:

- nuevos modulos en `backend/src/modules/*`
- `src/app/App.tsx` o componentes extraidos
- cliente API frontend

### Fase 7 - Escrituras Controladas

Objetivo:

- Crear/actualizar/cerrar ofertas.
- Registrar postulaciones.
- Registrar encuestas y asociarlas a egresado.
- Usar procedimientos almacenados existentes si calzan.
- Respetar triggers y errores `SIGNAL`.

### Fase 8 - Modularizacion Frontend

Objetivo:

- Extraer pantallas y datos de `src/app/App.tsx` cuando el acoplamiento empiece a impedir avances.
- Mantener diseno visual intacto.
- No hacer esta fase antes de integrar datos reales suficientes.

## Ultimo Estado Aprobado

Fecha: 2026-06-26.

Estado:

- Arquitectura documentada.
- Backend listo para nuevas rutas autenticadas.
- Frontend admin consume endpoints reales de lectura.
- Base de datos intacta.
- Proxima fase recomendada: Fase 5, validacion de sesion y paginacion admin.

## Archivos Importantes por Area

Frontend:

- `src/app/App.tsx`: UI principal y pantallas.
- `src/app/auth.ts`: autenticacion frontend y sesion.
- `src/main.tsx`: bootstrap React.
- `src/styles/index.css`: entrada de estilos.
- `vite.config.ts`: configuracion de build.

Backend:

- `backend/src/app.ts`: Express app y rutas.
- `backend/src/server.ts`: listener.
- `backend/src/config/env.ts`: entorno.
- `backend/src/config/db.ts`: MySQL pool.
- `backend/src/config/jwt.ts`: JWT.
- `backend/src/middleware/errorHandler.ts`: errores.
- `backend/src/modules/auth/*`: autenticacion.
- `backend/src/modules/health/*`: health check.
- `backend/src/modules/admin-dashboard/*`: dashboard admin.
- `backend/src/modules/egresados/*`: lectura admin de egresados.
- `backend/src/modules/empresas/*`: lectura admin de empresas.
- `backend/src/modules/ofertas/*`: lectura admin de ofertas.
- `backend/src/modules/encuestas/*`: lectura admin de encuestas.
- `backend/src/modules/auditoria/*`: lectura de auditoria.
- `backend/src/modules/notificaciones/*`: lectura de notificaciones.

Base de datos:

- `Database/Proyecto BD seguimiento egresado.sql`: esquema y data.
- `Database/Usuarios.sql`: usuarios MySQL y grants.
- `Database/Vistas.sql`: vistas utiles para endpoints GET.
- `Database/Procedimientos Almacenados.sql`: operaciones y reportes.
- `Database/Triggers.sql`: auditoria.
- `Database/Triggers Signal.sql`: validaciones.

## Reglas de Actualizacion

Al completar cualquier fase:

- Actualizar este archivo con fecha, fase, estado y archivos modificados.
- Actualizar `AI_CONTEXT.md` si hubo cambios de arquitectura, endpoints, modelo de auth, conexion DB, convenciones o restricciones.
- Mantener una lista clara de funcionalidades terminadas y pendientes.
- Registrar la siguiente fase recomendada.
