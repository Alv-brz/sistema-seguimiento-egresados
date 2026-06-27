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
- Paginacion y filtros reales agregados a listados de administrador.
- Pantallas de empresa conectadas a endpoints reales de lectura MySQL filtrados por JWT.
- Pantallas de egresado conectadas a endpoints reales de lectura MySQL filtrados por JWT.

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

Estado: implementada y mejorada en esta sesion.

Incluye:

- Cliente API frontend reutilizable en `src/app/api.ts`.
- Envio automatico de JWT Bearer desde la sesion guardada.
- Endpoints backend protegidos con `requireAuth` y `requireRole`.
- Endpoints de solo lectura para dashboard admin, egresados, empresas, ofertas, encuestas, auditoria y notificaciones.
- Sustitucion de mocks por datos reales de MySQL solo en pantallas de administrador.
- En esa fase Empresa y Egresado aun conservaban comportamiento mock; fueron conectados en fases posteriores.
- No se implementaron INSERT, UPDATE, DELETE ni CRUD.
- No se modifico `Database/`.
- Paginacion real desde backend/frontend para egresados, empresas, ofertas, encuestas, auditoria y notificaciones.
- Filtros/busqueda server-side cuando ya existian visualmente.
- Botones de editar, eliminar, cerrar oferta, guardar, exportar y marcar notificaciones en admin muestran aviso de fase CRUD.

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
- `backend/src/utils/pagination.ts`

Archivos modificados:

- `backend/src/app.ts`
- `src/app/App.tsx`
- `src/app/api.ts`
- `AI_CONTEXT.md`
- `PROJECT_STATUS.md`

### Fase 5 - Lectura Real para Empresa

Estado: implementada en esta sesion.

Incluye:

- Endpoints backend de solo lectura para rol `empresa`.
- Dashboard empresa con metricas reales de la empresa autenticada.
- Mis ofertas con datos reales, paginacion y filtros por estado/modalidad.
- Postulaciones recibidas con datos reales, paginacion, busqueda y filtro por estado.
- Perfil empresa con datos reales de tablas `empresa` y `usuario`.
- Notificaciones reales del usuario empresa autenticado.
- Todas las consultas de empresa filtran por `id_usuario` del JWT.
- No se implementaron INSERT, UPDATE, DELETE ni CRUD.
- No se modifico `Database/`.
- Botones de publicar, guardar, cerrar, editar, eliminar y cambiar estado muestran aviso de fase CRUD.

Archivos creados:

- `backend/src/modules/empresa/empresa.routes.ts`
- `backend/src/modules/empresa/empresa.controller.ts`
- `backend/src/modules/empresa/empresa.service.ts`

Archivos modificados:

- `backend/src/app.ts`
- `src/app/api.ts`
- `src/app/App.tsx`
- `AI_CONTEXT.md`
- `PROJECT_STATUS.md`

### Fase 6 - Lectura Real para Egresado

Estado: implementada en esta sesion.

Incluye:

- Endpoints backend de solo lectura para rol `egresado`.
- Dashboard egresado con perfil real, total de postulaciones, estado laboral actual, ultima empresa y ofertas activas.
- Bolsa laboral con ofertas activas reales, paginacion y filtros por busqueda/modalidad/tipo de contrato.
- Mis postulaciones con datos reales, paginacion y filtro por estado.
- Mi perfil con datos reales de `usuario`, `egresado`, `carrera` y `facultad`.
- Historial laboral real del egresado autenticado con paginacion.
- Ultima encuesta real asociada al egresado y fecha de proxima disponibilidad.
- Notificaciones reales del usuario egresado autenticado.
- Todas las consultas personales de egresado filtran por `id_usuario` del JWT.
- No se implementaron INSERT, UPDATE, DELETE ni CRUD.
- No se modifico `Database/`.
- Botones de postular, guardar, crear, editar, eliminar, enviar encuesta y marcar notificaciones muestran aviso de fase CRUD o quedan sin escritura.

Archivos creados:

- `backend/src/modules/egresado/egresado.routes.ts`
- `backend/src/modules/egresado/egresado.controller.ts`
- `backend/src/modules/egresado/egresado.service.ts`

Archivos modificados:

- `backend/src/app.ts`
- `src/app/api.ts`
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
- Paginacion real en listados admin.
- Filtros/busqueda reales en listados admin.
- Avisos claros para acciones aun no disponibles hasta CRUD.
- Dashboard empresa con datos reales.
- Mis ofertas de empresa con datos reales y alcance por JWT.
- Postulaciones recibidas de empresa con datos reales y alcance por JWT.
- Perfil empresa con datos reales.
- Notificaciones reales para empresa.
- Dashboard egresado con datos reales.
- Bolsa laboral de egresado con ofertas activas reales.
- Mis postulaciones de egresado con datos reales y alcance por JWT.
- Perfil egresado con datos reales.
- Historial laboral de egresado con datos reales.
- Encuesta de seguimiento con ultima encuesta real.
- Notificaciones reales para egresado.

## Funcionalidades Pendientes

- Consumir `GET /api/auth/me` al iniciar para validar sesion contra backend.
- Endpoints backend para reportes.
- Validacion de entrada por modulo.
- Proteccion de permisos por rol y por propietario del recurso.
- Manejo formal de variables `.env` y documentacion de ejemplo si falta.
- Pruebas automatizadas o checks de integracion.

## Fases Pendientes Recomendadas

### Fase 7 - Validacion de Sesion

Objetivo:

- Validar sesion con `GET /api/auth/me` al cargar la app.
- Manejar token invalido expirado cerrando sesion.
- Mantener endpoints de solo lectura.

Archivos probables:

- `src/app/auth.ts`
- `src/app/api.ts`
- `src/app/App.tsx`

### Fase 8 - Escrituras Controladas

Objetivo:

- Crear/actualizar/cerrar ofertas.
- Registrar postulaciones.
- Registrar encuestas y asociarlas a egresado.
- Usar procedimientos almacenados existentes si calzan.
- Respetar triggers y errores `SIGNAL`.

### Fase 9 - Modularizacion Frontend

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
- Frontend empresa consume endpoints reales de lectura.
- Frontend egresado consume endpoints reales de lectura.
- Listados admin tienen paginacion/filtros reales.
- Acciones de escritura/exportacion muestran aviso de fase CRUD.
- Base de datos intacta.
- Proxima fase recomendada: Fase 7, validacion de sesion.

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
- `backend/src/modules/empresa/*`: lectura por JWT para dashboard, ofertas, postulaciones y perfil empresa.
- `backend/src/modules/egresado/*`: lectura por JWT para dashboard, bolsa laboral, postulaciones, perfil, historial y encuesta egresado.

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
