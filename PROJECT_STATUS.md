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
- CRUD Empresa cerrado para ofertas, postulaciones recibidas y perfil propio, incluyendo crear, editar, cerrar/reactivar, eliminar condicionado y notificaciones reales.
- Sistema global de mensajes y confirmaciones implementado en toda la aplicacion; ya no se usan `alert()`, `confirm()` ni `prompt()` nativos.
- CRUD Egresado cerrado para postular a ofertas, editar perfil propio, CRUD de historial laboral, registrar encuesta y marcar notificaciones como leidas.
- Restauracion de ultima pantalla valida por rol al refrescar la pagina con sesion activa.
- CRUD Administrador Fase A implementado para configuracion del sistema, egresados, empresas y ofertas.
- Ajuste de coherencia previo a CRUD Administrador Fase B implementado: encuestas sin eliminacion, cuentas admin desactivables/reactivables y ofertas no eliminables si tienen postulaciones.
- Mejora general de usabilidad implementada: buscadores server-side en listados grandes, filtros visibles reducidos a los utiles y limpieza de etiquetas tecnicas SQL en formularios/vistas principales.
- Dashboard y Reportes corregidos: KPIs/graficos usan backend real, Reportes envia filtros al backend y actualiza datos filtrados.
- CRUD Administrador Fase B implementado: ofertas admin ya pueden crearse para empresas activas y notificaciones admin tienen crear/listar/marcar/eliminar.
- Eventos automaticos y notificaciones del sistema implementados: postulaciones, cierre/reactivacion de ofertas, desactivacion/reactivacion de cuentas y disponibilidad de encuestas generan notificaciones reales sin WebSockets y con deduplicacion.
- Flujo de lectura y visualizacion de notificaciones corregido: la app valida la sesion guardada con `/api/auth/me`, el modulo Notificaciones no muestra fallback mock cuando hay API real, `GET /api/notificaciones` y `unread-count` se verificaron por JWT para admin/empresa/egresado, y los filtros de leidas/no leidas funcionan con o sin tilde.
- Estrategia de deduplicacion de notificaciones automaticas corregida: los eventos operativos ya no quedan bloqueados por 24 horas ni por texto repetido con eventos intermedios; solo se bloquea una notificacion equivalente reciente si sigue siendo la ultima del usuario, con bloqueo concurrente por `GET_LOCK`. Encuesta disponible deduplica por referencia de `id_encuesta`, sin impedir disponibilidades posteriores del mismo dia.

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

### Fase 7 - CRUD Empresa

Estado: cerrada y aprobada; CRUD Egresado ya fue implementado en una fase posterior.

Incluye:

- Publicacion real de ofertas desde Crear Oferta usando `id_empresa` derivado del JWT.
- Edicion real de ofertas propias de la empresa autenticada.
- Cierre real de ofertas propias cambiando `estado_oferta` a `Cerrada`.
- Reactivacion real de ofertas propias cambiando `estado_oferta` a `Activa`.
- Eliminacion real de ofertas propias solo cuando no existen postulaciones asociadas.
- Bloqueo de eliminacion con mensaje exacto cuando existen postulaciones: `No se puede eliminar una oferta con postulaciones asociadas. Puede cerrarla.`
- Formulario/modal completo para editar ofertas, sin `prompt()`, cargando todos los datos existentes.
- Correccion del error `Cannot read properties of null (reading 'reset')` al crear oferta.
- Cambio real de estado de postulaciones propias a `Pendiente`, `Aceptado` o `Rechazado`.
- Actualizacion real del perfil de empresa y correo de usuario.
- Validaciones frontend/backend para salario, fechas, estado de oferta, correo y `pagina_web`.
- Propiedad obligatoria por `id_usuario` del JWT; una empresa no puede modificar ofertas ni postulaciones de otra empresa.
- Errores claros en frontend para validaciones y rechazos del backend.
- Refresco de listados despues de crear, editar, cerrar, reactivar, eliminar y cambiar estado.
- Badge real de notificaciones no leidas para administrador, empresa y egresado; se oculta si el contador es 0.
- `Marcar todas como leidas` quedo pendiente en esta fase y fue implementado posteriormente en Fase 9.
- No se modifico `Database/`.

Endpoints backend agregados:

- `POST /api/empresa/ofertas`
- `PUT /api/empresa/ofertas/:id`
- `PATCH /api/empresa/ofertas/:id/cerrar`
- `PATCH /api/empresa/ofertas/:id/estado`
- `DELETE /api/empresa/ofertas/:id`
- `PATCH /api/empresa/postulaciones/:id/estado`
- `PUT /api/empresa/perfil`
- `GET /api/notificaciones/unread-count`

Archivos modificados:

- `backend/src/modules/empresa/empresa.routes.ts`
- `backend/src/modules/empresa/empresa.controller.ts`
- `backend/src/modules/empresa/empresa.service.ts`
- `backend/src/modules/notificaciones/notificaciones.routes.ts`
- `backend/src/modules/notificaciones/notificaciones.controller.ts`
- `backend/src/modules/notificaciones/notificaciones.service.ts`
- `src/app/api.ts`
- `src/app/App.tsx`
- `AI_CONTEXT.md`
- `PROJECT_STATUS.md`

Verificacion realizada:

- `npm.cmd run build` en `backend/`: correcto.
- `npm.cmd run build` en frontend: correcto tras ejecutar fuera del sandbox por restriccion de acceso en la ruta de OneDrive; Vite solo reporto advertencia de chunk grande.
- Prueba HTTP real con API y MySQL: crear oferta, editar oferta, cerrar oferta, reactivar oferta, eliminar oferta sin postulaciones, intentar eliminar una oferta con postulaciones, contador de notificaciones y auditoria.

### Fase 8 - Sistema Global de Mensajes y Confirmaciones

Estado: implementada y aprobada por el usuario.

Incluye:

- `FeedbackProvider` global en `src/app/App.tsx` para todos los roles y pantallas.
- Toasts reutilizables de exito, error, advertencia e informacion.
- Reutilizacion de `sonner` instalado para la capa de toasts, con contenido personalizado al estilo visual actual.
- Modal propio de confirmacion con botones `Cancelar` y `Confirmar`.
- Eliminacion completa del uso de `alert()`, `confirm()` y `prompt()` nativos en `src/` y backend.
- `unavailableCrudAction()` ahora muestra toast informativo.
- Crear, editar, cerrar, reactivar y eliminar ofertas usan toasts y confirmaciones propias.
- Postulaciones, perfil, login, logout, notificaciones y errores de validacion usan el sistema global.
- No se modifico `Database/`.

Archivos modificados:

- `src/app/App.tsx`
- `AI_CONTEXT.md`
- `PROJECT_STATUS.md`

Verificacion realizada:

- `rg` confirmo que no existen `alert()`, `confirm()` ni `prompt()` en `src/` ni backend.
- `npm.cmd run build` en `backend/`: correcto.
- `npm.cmd run build` en frontend: correcto tras ejecutar fuera del sandbox por restriccion de acceso en la ruta de OneDrive; Vite solo reporto advertencia de chunk grande.
- Prueba HTTP real con API y MySQL: login, crear oferta, editar oferta, cerrar oferta, reactivar oferta, eliminar oferta sin postulaciones, bloqueo por postulaciones, actualizar perfil, contador de notificaciones y error de validacion.

### Fase 9 - CRUD Egresado

Estado: cerrada en esta sesion, pendiente de aprobacion del usuario antes de iniciar CRUD Administrador.

Incluye:

- Postulacion real desde Bolsa Laboral usando `id_usuario` del JWT como `id_egresado`.
- Validacion de oferta activa, fecha de cierre vigente y postulacion duplicada.
- Mis Postulaciones muestra solo postulaciones del egresado autenticado; acciones no permitidas siguen informando mediante toast.
- Actualizacion real del perfil de egresado en tablas `usuario` y `egresado`.
- Catalogo real de carreras para el formulario de perfil.
- Validaciones de DNI de 8 digitos, sexo `M/F`, fecha de egreso no futura, correo valido y carrera existente.
- CRUD real de historial laboral propio: crear, editar y eliminar.
- Validaciones de historial para salario no negativo y `fecha_fin >= fecha_inicio`.
- Registro real de encuesta de seguimiento y asociacion con `seguimiento_egresado`.
- Validacion de sueldo no negativo y disponibilidad de encuesta segun `configuracion_sistema.tiempo_entre_encuestas_meses`.
- Notificaciones reales para egresado: marcar una como leida, marcar todas como leidas y refrescar contador/badge.
- Todas las escrituras de egresado filtran por `res.locals.auth.id_usuario`; no se acepta `id_egresado` desde el frontend.
- No se modifico `Database/`.
- No se modifico el diseno visual aprobado ni estilos globales.

Endpoints backend agregados:

- `GET /api/egresado/carreras`
- `POST /api/egresado/postulaciones`
- `PUT /api/egresado/perfil`
- `POST /api/egresado/historial`
- `PUT /api/egresado/historial/:id`
- `DELETE /api/egresado/historial/:id`
- `POST /api/egresado/encuesta`
- `PATCH /api/notificaciones/:id/leida`
- `PATCH /api/notificaciones/leer-todas`

Archivos modificados:

- `backend/src/modules/egresado/egresado.routes.ts`
- `backend/src/modules/egresado/egresado.controller.ts`
- `backend/src/modules/egresado/egresado.service.ts`
- `backend/src/modules/notificaciones/notificaciones.routes.ts`
- `backend/src/modules/notificaciones/notificaciones.controller.ts`
- `backend/src/modules/notificaciones/notificaciones.service.ts`
- `src/app/api.ts`
- `src/app/App.tsx`
- `AI_CONTEXT.md`
- `PROJECT_STATUS.md`

Verificacion realizada:

- `npm.cmd run build` en `backend/`: correcto.
- `npm.cmd run build` en frontend: correcto tras ejecutar fuera del sandbox por restriccion de acceso en la ruta de OneDrive; Vite solo reporto advertencia de chunk grande.
- `rg` confirmo que no existen `alert()`, `confirm()` ni `prompt()` en `src/` ni backend.
- Prueba HTTP real con API y MySQL: login con egresado real.
- Prueba HTTP real: postular a oferta activa y vigente creada para prueba.
- Prueba HTTP real: intento de postular dos veces devuelve 409 con mensaje claro.
- Prueba HTTP real: intento de postular a oferta cerrada devuelve 422.
- Prueba HTTP real: intento de postular a oferta activa vencida devuelve 422.
- Prueba HTTP real: editar perfil y restaurar datos originales.
- Prueba HTTP real: crear, editar y eliminar historial laboral propio.
- Prueba HTTP real: otro egresado no puede editar historial ajeno y recibe 404.
- Prueba HTTP real: enviar encuesta disponible y bloquear envio duplicado por disponibilidad.
- Prueba HTTP real: marcar una notificacion como leida, marcar todas como leidas y verificar contador en cero.
- Auditoria verificada para las operaciones cubiertas por triggers existentes: `postulacion`, `oferta_laboral` y `egresado`.

### Fase 10 - Restauracion de Pantalla al Refrescar

Estado: implementada en esta sesion, pendiente de aprobacion del usuario antes de continuar con CRUD Administrador.

Incluye:

- Persistencia de la ultima pantalla valida por rol en `localStorage`.
- Restauracion de pantalla al refrescar la pagina con una sesion activa guardada.
- Validacion de la pantalla guardada contra `ROLE_SCREENS` del rol autenticado.
- Retorno automatico al dashboard del rol si la pantalla guardada no es valida.
- Mantenimiento de la SPA sin React Router y sin cambios visuales ni de estilos.
- No se modifico `Database/`.

Archivos modificados:

- `src/app/App.tsx`
- `AI_CONTEXT.md`
- `PROJECT_STATUS.md`

Verificacion realizada:

- `npm.cmd run build` en `backend/`: correcto.
- `npm.cmd run build` en frontend: correcto tras ejecutar fuera del sandbox por restriccion de acceso en la ruta de OneDrive; Vite solo reporto advertencia de chunk grande.

### Fase 11 - CRUD Administrador Fase A

Estado: implementada en esta sesion, pendiente de aprobacion del usuario antes de iniciar CRUD Administrador Fase B.

Incluye:

- Confirmacion real en MySQL de tabla `configuracion_sistema`.
- Backend `admin-configuracion` protegido con `requireAuth` y `requireRole("admin")`.
- Pantalla Configuracion conectada a `configuracion_sistema` para lectura y actualizacion.
- `tiempo_entre_encuestas_meses` reemplaza completamente el valor fijo de 6 meses en la logica del egresado.
- Valor `0` en `tiempo_entre_encuestas_meses` permite responder encuesta inmediatamente.
- CRUD administrador real de egresados: crear, editar y eliminar si la integridad referencial lo permite.
- CRUD administrador real de empresas: crear, editar y eliminar si la integridad referencial lo permite.
- Gestion administrador de ofertas: editar cualquier oferta, activar/cerrar y eliminar si la integridad referencial lo permite.
- Gestion administrador de encuestas: detalle/listado existente y eliminacion controlada por integridad referencial.
- Errores `SIGNAL`, duplicados e integridad referencial se muestran mediante toasts del sistema.
- No se modificaron scripts existentes de `Database/` durante la implementacion de backend/frontend.

Archivos creados:

- `backend/src/modules/admin-configuracion/admin-configuracion.routes.ts`
- `backend/src/modules/admin-configuracion/admin-configuracion.controller.ts`
- `backend/src/modules/admin-configuracion/admin-configuracion.service.ts`

Archivos modificados:

- `backend/src/app.ts`
- `backend/src/middleware/errorHandler.ts`
- `backend/src/modules/egresado/egresado.service.ts`
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
- `src/app/api.ts`
- `src/app/App.tsx`
- `AI_CONTEXT.md`
- `PROJECT_STATUS.md`

Verificacion realizada:

- `npm.cmd run build` en `backend/`: correcto.
- `npm.cmd run build` en frontend: correcto tras ejecutar fuera del sandbox por restriccion de acceso en la ruta de OneDrive; Vite solo reporto advertencia de chunk grande.
- Prueba HTTP real: health y login admin/empresa/egresado activo real.
- Prueba HTTP real: configuracion lee/actualiza/restaura `tiempo_entre_encuestas_meses`.
- Prueba HTTP real: con `tiempo_entre_encuestas_meses = 0`, endpoint de encuesta de egresado devuelve disponibilidad inmediata.
- Prueba HTTP real: empresa no puede acceder a endpoints de configuracion admin y recibe 403.
- Prueba HTTP real: crear, editar y eliminar egresado de prueba.
- Prueba HTTP real: crear, editar y eliminar empresa de prueba.
- Prueba HTTP real: editar oferta existente, cambiar estado y restaurar estado/datos originales.
- Prueba HTTP real: intentar eliminar encuesta asociada devuelve 409 por integridad referencial.
- Prueba HTTP real: auditoria registra cambios de `configuracion_sistema`.
- `rg` confirmo que no quedan referencias fijas a `INTERVAL 6`, `6 MONTH`, `cada 6` ni `defaultValue={6}` en `backend/` o `src/`.

### Fase 12 - Ajuste de Coherencia de Acciones

Estado: implementada en esta sesion, pendiente de aprobacion del usuario antes de iniciar CRUD Administrador Fase B.

Incluye:

- Gestion de Encuestas ya no muestra boton Eliminar; mantiene solo Ver detalle.
- Gestion de Encuestas muestra ayuda discreta: `Las encuestas respondidas forman parte del historial del egresado y no se eliminan.`
- Backend de encuestas ya no expone `DELETE /api/encuestas/:id`.
- Gestion de Egresados mantiene eliminacion condicionada por integridad referencial y agrega Desactivar/Reactivar cuenta.
- Desactivar/Reactivar egresado actualiza `usuario.estado_usuario` mediante `PATCH /api/egresados/:id/estado`.
- Gestion de Empresas mantiene eliminacion condicionada por integridad referencial y agrega Desactivar/Reactivar cuenta.
- Desactivar/Reactivar empresa actualiza `usuario.estado_usuario` mediante `PATCH /api/empresas/:id/estado`.
- Gestion de Ofertas bloquea explicitamente la eliminacion si existen postulaciones asociadas, antes de intentar el `DELETE`.
- El bloqueo de oferta con postulaciones devuelve: `No se puede eliminar una oferta con postulaciones asociadas. Puede cerrarla.`
- Mensajes genericos de integridad referencial se reemplazaron por un mensaje claro que sugiere desactivar cuando corresponde.
- Se mantuvieron JWT, roles, toasts, confirmaciones internas, auditoria/triggers y validaciones `SIGNAL`.
- No se modifico `Database/`, estilos globales ni diseno general.

Endpoints backend agregados o ajustados:

- `PATCH /api/egresados/:id/estado`
- `PATCH /api/empresas/:id/estado`
- `DELETE /api/ofertas/:id` ahora valida conteo de postulaciones antes de eliminar.
- `DELETE /api/encuestas/:id` removido.

Archivos modificados:

- `backend/src/middleware/errorHandler.ts`
- `backend/src/modules/egresados/egresados.routes.ts`
- `backend/src/modules/egresados/egresados.controller.ts`
- `backend/src/modules/egresados/egresados.service.ts`
- `backend/src/modules/empresas/empresas.routes.ts`
- `backend/src/modules/empresas/empresas.controller.ts`
- `backend/src/modules/empresas/empresas.service.ts`
- `backend/src/modules/ofertas/ofertas.controller.ts`
- `backend/src/modules/ofertas/ofertas.service.ts`
- `backend/src/modules/encuestas/encuestas.routes.ts`
- `backend/src/modules/encuestas/encuestas.controller.ts`
- `backend/src/modules/encuestas/encuestas.service.ts`
- `src/app/api.ts`
- `src/app/App.tsx`
- `AI_CONTEXT.md`
- `PROJECT_STATUS.md`

Verificacion realizada:

- `npm.cmd run build` en `backend/`: correcto.
- `npm.cmd run build` en frontend: correcto tras ejecutar fuera del sandbox por restriccion de acceso en la ruta de OneDrive; Vite solo reporto advertencia de chunk grande.
- `rg` confirmo que no quedan referencias a `eliminarEncuesta`, `deleteEncuesta`, `Eliminar encuesta`, `DELETE` de encuestas ni ventanas nativas `alert()`, `confirm()` o `prompt()`.
- Prueba HTTP real: `DELETE /api/encuestas/1` ya no existe y responde 404.
- Prueba HTTP real: egresado admin alterna `Activo/Inactivo` y se restaura al estado original.
- Prueba HTTP real: empresa admin alterna `Activo/Inactivo` y se restaura al estado original.
- Prueba HTTP real: oferta con 44 postulaciones asociadas responde 409 con el mensaje requerido.
- Prueba HTTP real: oferta temporal sin postulaciones se crea y elimina correctamente.

### Fase 13 - Mejora de Usabilidad: Buscadores, Filtros y Etiquetas

Estado: implementada en esta sesion, pendiente de aprobacion del usuario antes de iniciar CRUD Administrador Fase B.

Incluye:

- Busqueda server-side agregada o normalizada en listados grandes de administrador: egresados, empresas, ofertas laborales, encuestas, auditoria y notificaciones.
- Busqueda server-side agregada o normalizada en listados de empresa: mis ofertas y postulaciones recibidas.
- Busqueda server-side agregada o normalizada en listados de egresado: bolsa laboral, mis postulaciones e historial laboral.
- Los buscadores mantienen paginacion real, filtros existentes utiles y resetean a pagina 1 al cambiar.
- Estados vacios visibles cuando una busqueda/filtro no devuelve resultados.
- Filtros visibles reducidos a los utiles: carrera/estado de usuario, sector/estado de usuario, estado/modalidad, estado de postulacion, estado laboral, accion/tabla afectada, todas/leidas/no leidas y actual/no actual en historial.
- Limpieza de etiquetas visibles en formularios y detalles principales para evitar tipos SQL, nombres de columnas y ayudas tecnicas.
- Auditoria conserva valores internos para consulta, pero muestra acciones legibles como Crear, Actualizar y Eliminar.
- No se modifico `Database/`, estilos globales, diseno general, JWT, roles, auditoria ni validaciones `SIGNAL`.

Archivos modificados:

- `backend/src/modules/egresados/egresados.controller.ts`
- `backend/src/modules/egresados/egresados.service.ts`
- `backend/src/modules/empresas/empresas.controller.ts`
- `backend/src/modules/empresas/empresas.service.ts`
- `backend/src/modules/ofertas/ofertas.controller.ts`
- `backend/src/modules/ofertas/ofertas.service.ts`
- `backend/src/modules/encuestas/encuestas.controller.ts`
- `backend/src/modules/encuestas/encuestas.service.ts`
- `backend/src/modules/empresa/empresa.controller.ts`
- `backend/src/modules/empresa/empresa.service.ts`
- `backend/src/modules/egresado/egresado.controller.ts`
- `backend/src/modules/egresado/egresado.service.ts`
- `backend/src/modules/notificaciones/notificaciones.controller.ts`
- `backend/src/modules/notificaciones/notificaciones.service.ts`
- `src/app/api.ts`
- `src/app/App.tsx`
- `AI_CONTEXT.md`
- `PROJECT_STATUS.md`

Verificacion realizada:

- `npm.cmd run build` en `backend/`: correcto.
- `npm.cmd run build` en frontend: correcto tras ejecutar fuera del sandbox por restriccion de acceso en la ruta de OneDrive; Vite solo reporto advertencia de chunk grande.
- Prueba HTTP real con JWT admin: busqueda/filtros en egresados, empresas, ofertas, encuestas, auditoria y notificaciones.
- Prueba HTTP real con JWT empresa: busqueda/filtros en mis ofertas y postulaciones recibidas.
- Prueba HTTP real con JWT egresado: busqueda/filtros en bolsa laboral, mis postulaciones e historial laboral.
- Revision de interfaz en `src/app/App.tsx`: formularios principales y vistas solicitadas usan etiquetas amigables; las coincidencias tecnicas restantes son nombres internos de propiedades, datos mock o comentarios de desarrollo, no textos de ayuda visibles.

### Fase 14 - Correccion de Dashboard y Reportes

Estado: implementada en esta sesion.

Incluye:

- Dashboard de administrador confirmado contra datos reales de `/api/admin/dashboard`.
- KPIs del Dashboard sin etiquetas tecnicas visibles como `tabla egresado`, `tabla empresa`, `nombre_carrera`, `nombre_facultad` o `estado_laboral`.
- `GET /api/admin/dashboard` acepta filtros opcionales `facultad`, `carrera`, `anio` y `estadoLaboral`.
- Reportes y Estadisticas envia filtros al backend solo al presionar `Aplicar`.
- KPIs y graficos de Reportes se recalculan con la respuesta filtrada del backend.
- Filtros por facultad/carrera limitan las series de egresados, encuestas y postulaciones segun el egresado asociado.
- Ofertas y empresas se filtran por postulaciones de egresados asociados cuando se aplican filtros academicos; sin filtros se mantiene el resumen global.
- Estado vacio visible cuando una combinacion de filtros no tiene informacion.
- No se modifico `Database/`, diseno visual ni estructura general de paginas.

Archivos modificados:

- `backend/src/modules/admin-dashboard/admin-dashboard.controller.ts`
- `backend/src/modules/admin-dashboard/admin-dashboard.service.ts`
- `src/app/api.ts`
- `src/app/App.tsx`
- `AI_CONTEXT.md`
- `PROJECT_STATUS.md`

Verificacion realizada:

- `npm.cmd run build` en `backend/`: correcto.
- `npm.cmd run build` en frontend: correcto tras ejecutar fuera del sandbox por restriccion de acceso en la ruta de OneDrive; Vite solo reporto advertencia de chunk grande.
- Prueba HTTP real con JWT admin: `/api/admin/dashboard` global responde KPIs y series.
- Prueba HTTP real con JWT admin: filtro por `Facultad de Ingeniería` cambia KPIs y deja una sola facultad en el grafico correspondiente.
- Prueba HTTP real con JWT admin: filtro por `Ingeniería de Sistemas` devuelve solo esa carrera y `Facultad de Ingeniería`.
- Prueba HTTP real con JWT admin: combinacion `facultad + carrera + anio + estadoLaboral` cambia KPIs y graficos.
- Prueba HTTP real con JWT admin: combinacion sin registros devuelve KPIs en cero y series vacias para estado vacio.

### Fase 15 - CRUD Administrador Fase B

Estado: implementada en esta sesion.

Incluye:

- Revision de CRUD administrador existentes para egresados, empresas, ofertas, encuestas, notificaciones y usuarios/admin aplicables.
- Egresados mantiene crear, listar, ver detalle, editar, buscar, filtrar, paginar, estado vacio, eliminar solo si la integridad lo permite y desactivar/reactivar si tiene historial.
- Empresas mantiene crear, listar, ver detalle, editar, buscar, filtrar, paginar, estado vacio, eliminar solo si la integridad lo permite y desactivar/reactivar si tiene relaciones.
- Ofertas completa creacion desde administrador para empresas activas, ademas de listar, ver detalle, editar, cerrar/reactivar, buscar, filtrar, paginar y eliminar solo si no tiene postulaciones.
- Ofertas con postulaciones siguen bloqueando eliminacion con mensaje claro: `No se puede eliminar una oferta con postulaciones asociadas. Puede cerrarla.`
- Encuestas quedan como historico solo lectura/detalle, con busqueda, filtro, paginacion y estado vacio; no se reintrodujo eliminacion.
- Notificaciones de administrador permiten crear, listar, buscar, filtrar, paginar, marcar una/todas como leidas y eliminar notificaciones propias.
- Empresa y Egresado conservan notificaciones propias solo para listar/marcar, sin acciones administrativas.
- No se implemento CRUD separado de usuarios/admin porque no existe pantalla administrativa ni requisito funcional concreto fuera de las tablas hijas ya gestionadas.
- No se modifico `Database/`, estilos globales ni diseno general.
- Se mantuvieron JWT, roles, seguridad, auditoria/triggers existentes, validaciones `SIGNAL`, toasts y modales internos.

Endpoints backend agregados:

- `POST /api/ofertas`
- `POST /api/notificaciones`
- `DELETE /api/notificaciones/:id`

Archivos modificados:

- `backend/src/modules/ofertas/ofertas.routes.ts`
- `backend/src/modules/ofertas/ofertas.controller.ts`
- `backend/src/modules/ofertas/ofertas.service.ts`
- `backend/src/modules/notificaciones/notificaciones.routes.ts`
- `backend/src/modules/notificaciones/notificaciones.controller.ts`
- `backend/src/modules/notificaciones/notificaciones.service.ts`
- `src/app/api.ts`
- `src/app/App.tsx`
- `AI_CONTEXT.md`
- `PROJECT_STATUS.md`

Verificacion realizada:

- `npm.cmd run build` en `backend/`: correcto.
- `npm.cmd run build` en frontend: correcto tras ejecutar fuera del sandbox por restriccion de acceso en la ruta de OneDrive; Vite solo reporto advertencia de chunk grande.
- Prueba HTTP real con JWT admin: listar/buscar/filtrar egresados.
- Prueba HTTP real con JWT admin: crear, editar, desactivar, reactivar y eliminar egresado temporal sin relaciones.
- Prueba HTTP real con JWT admin: crear, editar, desactivar, reactivar y eliminar empresa temporal sin relaciones.
- Prueba HTTP real con JWT admin: crear, editar, cerrar, reactivar y eliminar oferta temporal sin postulaciones.
- Prueba HTTP real con JWT admin: intento de eliminar oferta con postulaciones responde 409 y queda bloqueado.
- Prueba HTTP real con JWT admin: encuestas listan/buscan como historico sin eliminacion.
- Prueba HTTP real con JWT admin: crear, listar, marcar como leida y eliminar notificacion temporal propia.
- Prueba HTTP real con JWT admin: Dashboard/Reportes siguen respondiendo con filtros.
- `rg` confirmo que no existen `alert()`, `confirm()` ni `prompt()` en `src/` ni `backend/`.
- Revision de etiquetas visibles: no se agregaron tipos SQL ni nombres tecnicos visibles; coincidencias restantes son propiedades internas de datos.

### Fase 16 - Eventos Automaticos y Notificaciones del Sistema

Estado: implementada en esta sesion.

Incluye:

- Notificacion automatica al egresado cuando una empresa cambia una postulacion propia a `Pendiente`, `Aceptado` o `Rechazado`.
- Notificacion automatica a todos los egresados postulantes cuando una empresa cierra una oferta propia.
- Notificacion automatica a todos los egresados postulantes cuando una empresa reactiva una oferta propia.
- Notificacion automatica al usuario afectado cuando un administrador desactiva una cuenta de egresado o empresa.
- Notificacion automatica al usuario afectado cuando un administrador reactiva una cuenta de egresado o empresa.
- Notificacion automatica al egresado cuando su encuesta vuelve a estar disponible segun `configuracion_sistema.tiempo_entre_encuestas_meses`.
- Deduplicacion de notificaciones automaticas por usuario, titulo y mensaje para evitar eventos repetidos innecesarios.
- Generacion de notificacion de encuesta disponible al consultar contador/listado de notificaciones o la pantalla de encuesta.
- La empresa solo puede generar notificaciones derivadas de ofertas/postulaciones propias, usando `id_empresa` del JWT.
- El administrador solo genera notificaciones administrativas desde rutas protegidas por rol.
- No se agregaron WebSockets; el contador y listado se actualizan al consultar endpoints, volver al modulo o recargar.
- No se modifico `Database/`, ni estilos globales ni diseno general.
- Se mantuvieron JWT, roles, auditoria/triggers existentes, toasts, modales y confirmaciones propias.

Archivos modificados:

- `backend/src/modules/notificaciones/notificaciones.service.ts`
- `backend/src/modules/notificaciones/notificaciones.controller.ts`
- `backend/src/modules/empresa/empresa.service.ts`
- `backend/src/modules/empresa/empresa.controller.ts`
- `backend/src/modules/egresado/egresado.controller.ts`
- `backend/src/modules/egresados/egresados.controller.ts`
- `backend/src/modules/empresas/empresas.controller.ts`
- `src/app/App.tsx`
- `AI_CONTEXT.md`
- `PROJECT_STATUS.md`

Verificacion realizada:

- `npm.cmd run build` en `backend/`: correcto.
- `npm.cmd run build` en frontend: correcto tras ejecutar fuera del sandbox por restriccion de acceso en la ruta de OneDrive; Vite solo reporto advertencia de chunk grande.
- Prueba HTTP real con JWT empresa y egresado temporal: cambiar postulacion a `Aceptado` genera una notificacion al egresado.
- Prueba HTTP real con JWT empresa y egresado temporal: cambiar postulacion a `Rechazado` genera una notificacion al egresado.
- Prueba HTTP real con JWT empresa y egresado temporal: cambiar postulacion a `Pendiente` genera una notificacion al egresado.
- Prueba HTTP real con JWT empresa y egresado temporal: cerrar oferta con postulante genera una notificacion al egresado.
- Prueba HTTP real con JWT empresa y egresado temporal: reactivar oferta con postulante genera una notificacion al egresado.
- Prueba HTTP real con JWT admin y egresado temporal: desactivar cuenta genera una notificacion al usuario afectado.
- Prueba HTTP real con JWT admin y egresado temporal: reactivar cuenta genera una notificacion al usuario afectado.
- Prueba HTTP real de duplicados: repetir estado `Aceptado` y cierre reciente no genero notificaciones duplicadas.
- Prueba HTTP real de contador/listado: el egresado recibio 7 notificaciones esperadas y `unread-count` devolvio 7.
- Prueba HTTP real de encuesta disponible: al consultar dos veces el contador se creo una sola notificacion de encuesta disponible.
- `rg` confirmo que no existen `alert()`, `confirm()` ni `prompt()` en `src/` ni `backend/`.

### Fase 17 - Correccion de Lectura y Visualizacion de Notificaciones

Estado: implementada en esta sesion.

Incluye:

- Identificacion de causa raiz: con un JWT persistido vencido o invalido, el frontend seguia considerando la sesion local como valida; las llamadas reales a notificaciones fallaban y el hook de datos paginados reemplazaba el resultado por fallback local, por eso las notificaciones existian en MySQL pero no eran visibles en la pantalla.
- Validacion de sesion guardada contra `GET /api/auth/me` al iniciar la app; si no es valida, se limpia `localStorage` y se muestra login.
- Pantalla Notificaciones sin fallback mock cuando `useApi=true`, para no renderizar datos locales desincronizados frente a errores de API.
- Normalizacion frontend de `leido` para renderizar correctamente valores `0`, `1`, `false`, `true` o strings equivalentes.
- `GET /api/notificaciones` devuelve `leido + 0 AS leido`, filtra por el `id_usuario` autenticado y ordena por `fecha_envio DESC, id_notificacion DESC`.
- Filtros backend de notificaciones robustos para `Leidas/Leídas` y `No leidas/No leídas`.
- `POST /api/notificaciones` desde admin acepta opcionalmente `id_usuario` para crear una notificacion manual dirigida a un destinatario; si no se envia, conserva el comportamiento de crearla para el admin autenticado.
- Contador y listado verificados sobre los mismos endpoints reales para admin, empresa y egresado.
- No se modifico `Database/`, estilos globales ni diseno general.

Archivos modificados:

- `src/app/auth.ts`
- `src/app/api.ts`
- `src/app/App.tsx`
- `backend/src/modules/notificaciones/notificaciones.controller.ts`
- `backend/src/modules/notificaciones/notificaciones.service.ts`
- `AI_CONTEXT.md`
- `PROJECT_STATUS.md`

Verificacion realizada:

- `npm.cmd run build` en `backend/`: correcto.
- `npm.cmd run build` en frontend: correcto fuera del sandbox por restriccion de acceso en OneDrive; Vite solo reporto advertencia de chunk grande.
- `rg` confirmo que no existen `alert()`, `confirm()` ni `prompt()` en `src/` ni `backend/src/`.
- Prueba HTTP real con JWT admin, empresa y egresado temporal.
- Prueba HTTP real: crear notificacion manual admin propia y verla como admin.
- Prueba HTTP real: crear notificacion manual admin dirigida a empresa y verla como empresa.
- Prueba HTTP real: crear notificacion manual admin dirigida a egresado y verla como egresado con `leido = 0`.
- Prueba HTTP real: cambiar postulacion a `Aceptado`, repetir `Aceptado` y verificar que no se duplica, cambiar a `Rechazado` y ver notificaciones del egresado.
- Prueba HTTP real: cerrar y reactivar oferta de empresa con postulante y ver notificaciones del egresado.
- Prueba HTTP real: desactivar y reactivar cuenta de egresado desde admin y ver notificaciones del usuario afectado.
- Prueba HTTP real: encuesta disponible genera una unica notificacion y el contador la incluye.
- Prueba HTTP real: filtro `Todas` muestra leidas y no leidas; `No leidas` solo `leido = 0`; `Leidas` solo `leido = 1`.
- Prueba HTTP real: marcar una notificacion como leida disminuye `unread-count`; marcar todas deja el contador en 0.

### Fase 18 - Revision y Correccion de Deduplicacion de Notificaciones Automaticas

Estado: implementada en esta sesion.

Incluye:

- Revision completa de la deduplicacion usada por cambios de estado de postulaciones, cierre/reactivacion de ofertas, desactivacion/reactivacion de cuentas de egresados y empresas, y encuesta disponible.
- Identificacion del criterio anterior: `createAutomaticNotificacion()` comparaba `id_usuario + titulo + mensaje`; por defecto usaba una ventana de 24 horas, y encuesta disponible usaba `dedupeHours: null`, equivalente a deduplicacion permanente para el mismo titulo/mensaje.
- Identificacion de riesgo funcional: una postulacion podia volver a `Aceptado`, una oferta podia volver a cerrarse o una cuenta podia volver a desactivarse dentro de 24 horas y la notificacion valida quedaba bloqueada por tener el mismo titulo/mensaje.
- Identificacion de un problema adicional de precision temporal: la ventana se calculaba en JavaScript con `toISOString()` UTC y se comparaba contra `fecha_envio`/`NOW()` de MySQL, lo que podia desplazar la ventana por zona horaria.
- Nuevo criterio para eventos operativos: deduplicacion por `id_usuario + titulo + mensaje` solo durante 30 segundos, calculada en MySQL con `DATE_SUB(NOW(), INTERVAL ? SECOND)`, y solo si esa notificacion equivalente sigue siendo la ultima notificacion del usuario. Esto evita spam por doble clic/doble HTTP, pero permite ciclos legitimos rapidos como `Aceptado -> Rechazado -> Pendiente -> Aceptado`.
- Nuevo criterio para concurrencia: la decision de deduplicar/insertar notificaciones automaticas queda serializada con `GET_LOCK` por clave de evento, evitando que dos peticiones simultaneas pasen el `SELECT` y creen dos filas.
- Nuevo criterio para encuesta disponible: ya no depende de deduplicacion permanente por texto ni de una frontera diaria por `fecha_registro`; el mensaje incluye `Referencia: <id_encuesta>` y se bloquea solo si ya existe esa misma notificacion de encuesta, permitiendo una nueva disponibilidad legitima aunque la encuesta posterior se registre el mismo dia.
- Se mantuvo la proteccion contra duplicados accidentales por doble clic, doble peticion HTTP o repeticion inmediata del mismo evento.
- No se reescribio el sistema de notificaciones, no se crearon tablas y no se modifico `Database/`.

Archivos modificados:

- `backend/src/modules/notificaciones/notificaciones.service.ts`
- `AI_CONTEXT.md`
- `PROJECT_STATUS.md`

Verificacion realizada:

- `npm.cmd run build` en `backend/`: correcto.
- `npm.cmd run build` en frontend: correcto fuera del sandbox por restriccion de acceso en OneDrive; Vite solo reporto advertencia de chunk grande.
- `rg` confirmo que no existen `alert()`, `confirm()` ni `prompt()` en `src/` ni `backend/src/`.
- Prueba HTTP real con JWT admin, empresa y egresado temporal.
- Prueba HTTP real: cambio de postulacion `Pendiente -> Aceptado -> Rechazado -> Pendiente -> Aceptado` con doble peticion inmediata de `Aceptado`; resultado: `Aceptado=2`, `Rechazado=1`, `Pendiente=1`.
- Prueba HTTP real: oferta `Cerrar -> Reactivar -> Cerrar nuevamente` con doble peticion inmediata de cierre; resultado: `Cerrada=2`, `Reactivada=1`.
- Prueba HTTP real: cuenta de egresado `Desactivar -> Reactivar -> Desactivar nuevamente` con doble peticion inmediata; resultado: `Desactivada=2`, `Reactivada=1`.
- Prueba HTTP real: cuenta de empresa `Desactivar -> Reactivar -> Desactivar nuevamente` con doble peticion inmediata; resultado: `Desactivada=2`, `Reactivada=1`.
- Prueba HTTP real: encuesta con `tiempo_entre_encuestas_meses = 0`; recargas simultaneas de contador/listado no duplicaron la disponibilidad vigente y una encuesta posterior genero una segunda notificacion valida (`antes=1`, `despues=2`).
- Prueba HTTP real: contador, listado, marcar una notificacion como leida y marcar todas como leidas siguieron funcionando (`antes_leer=13`, `tras_una=12`, `tras_todas=0`).

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
- Publicacion real de ofertas por empresa.
- Edicion, cierre, reactivacion y eliminacion condicionada de ofertas propias por empresa.
- Cambio real de estado de postulaciones propias por empresa.
- Actualizacion real de perfil empresa.
- Badge real de notificaciones no leidas para todos los roles.
- Sistema global de toasts y confirmaciones para administrador, empresa y egresado.
- Eliminacion de ventanas nativas `alert()`, `confirm()` y `prompt()` en la aplicacion.
- Postulacion real de egresados a ofertas activas y vigentes.
- Actualizacion real de perfil egresado.
- CRUD real de historial laboral propio del egresado.
- Registro real de encuesta de seguimiento del egresado.
- Marcar una o todas las notificaciones como leidas para el usuario autenticado.
- Restaurar la ultima pantalla valida del rol al refrescar la pagina con sesion activa.
- Configuracion real del sistema desde `configuracion_sistema`.
- CRUD Administrador Fase A para egresados, empresas y ofertas.
- Gestion de encuestas de administrador como historico solo lectura/detalle, sin eliminacion.
- Desactivar/reactivar cuentas de egresados y empresas desde administrador.
- Bloqueo explicito de eliminacion de ofertas con postulaciones asociadas desde administrador.
- Buscadores server-side en listados grandes de administrador, empresa y egresado.
- Filtros visibles reducidos a los necesarios por modulo.
- Etiquetas y ayudas visibles limpiadas para evitar tipos SQL y nombres tecnicos en la interfaz.
- Dashboard de administrador con etiquetas amigables y datos reales desde backend.
- Reportes y Estadisticas con filtros reales enviados al backend y KPIs/graficos filtrados.
- CRUD Administrador Fase B para ofertas y notificaciones, manteniendo reglas de integridad de egresados, empresas y encuestas.
- Notificaciones automaticas para cambios de estado de postulaciones.
- Notificaciones automaticas para cierre y reactivacion de ofertas con postulantes.
- Notificaciones automaticas para desactivacion y reactivacion administrativa de cuentas.
- Notificacion automatica cuando una encuesta vuelve a estar disponible para el egresado.
- Deduplicacion de notificaciones automaticas equivalentes para evitar repetidos inmediatos sin bloquear eventos legitimos posteriores.
- Lectura y visualizacion de notificaciones corregida para administrador, empresa y egresado.
- Validacion de sesion local contra `GET /api/auth/me` al iniciar la app.

## Funcionalidades Pendientes

- Exportacion real de reportes a PDF/Excel.
- Validacion de entrada por modulo.
- Proteccion de permisos por propietario del recurso para modulos pendientes fuera de Empresa y Egresado.
- Manejo formal de variables `.env` y documentacion de ejemplo si falta.
- Pruebas automatizadas o checks de integracion.

## Fases Pendientes Recomendadas

### Fase 19 - Modularizacion Frontend

Objetivo:

- Extraer pantallas y datos de `src/app/App.tsx` cuando el acoplamiento empiece a impedir avances.
- Mantener diseno visual intacto.
- No hacer esta fase antes de integrar datos reales suficientes.

## Ultimo Estado Aprobado

Fecha: 2026-06-27.

Estado:

- Arquitectura documentada.
- Backend listo para nuevas rutas autenticadas.
- Frontend admin consume endpoints reales de lectura.
- Frontend empresa consume endpoints reales de lectura.
- Frontend egresado consume endpoints reales de lectura.
- Frontend empresa ejecuta escrituras reales aprobadas para ofertas, postulaciones y perfil.
- Frontend egresado ejecuta escrituras reales aprobadas para postulaciones, perfil, historial, encuesta y notificaciones.
- CRUD Empresa queda cerrado funcionalmente.
- CRUD Egresado queda cerrado funcionalmente y espera aprobacion del usuario antes de iniciar CRUD Administrador.
- CRUD Administrador Fase A queda implementado.
- Ajuste de coherencia de acciones queda implementado y espera aprobacion del usuario antes de iniciar CRUD Administrador Fase B.
- Mejora de usabilidad de buscadores, filtros y etiquetas queda implementada y espera aprobacion del usuario antes de iniciar CRUD Administrador Fase B.
- Dashboard y Reportes quedan corregidos con filtros reales desde backend.
- CRUD Administrador Fase B queda implementado y validado con pruebas HTTP reales.
- Refresco de pagina restaura la ultima pantalla valida del rol autenticado.
- Sistema global de mensajes y confirmaciones activo en toda la aplicacion; no quedan ventanas nativas del navegador.
- Listados admin, empresa y egresado principales tienen paginacion, busqueda y filtros reales donde corresponde.
- Reportes y Estadisticas actualiza KPIs y graficos al aplicar filtros.
- Notificaciones se listan y cuentan desde endpoints reales por `id_usuario` autenticado; filtros, contador y marcado como leida quedan validados para admin, empresa y egresado.
- Acciones de escritura/exportacion no implementadas fuera de Empresa, Egresado y Administrador aprobado muestran aviso informativo.
- Base de datos intacta.
- Proxima fase recomendada: modularizacion frontend o exportacion real de reportes, si el usuario lo autoriza.

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
- `backend/src/modules/notificaciones/*`: lectura, contador y marcado de notificaciones del usuario autenticado.
- `backend/src/modules/empresa/*`: lectura y CRUD aprobado por JWT para dashboard, ofertas, postulaciones y perfil empresa.
- `backend/src/modules/egresado/*`: lectura y CRUD aprobado por JWT para dashboard, bolsa laboral, postulaciones, perfil, historial y encuesta egresado.

Base de datos:

- `Database/Proyecto BD seguimiento egresado.sql`: esquema y data.
- `Database/Usuarios.sql`: usuarios MySQL y grants.
- `Database/Vistas.sql`: vistas utiles para endpoints GET.
- `Database/Procedimientos Almacenados.sql`: operaciones y reportes.
- `Database/Triggers.sql`: auditoria.
- `Database/Triggers Signal.sql`: validaciones.
- `Database/ConfiguracionSistema.sql`: tabla `configuracion_sistema`, insert inicial y triggers aprobados.

## Reglas de Actualizacion

Al completar cualquier fase:

- Actualizar este archivo con fecha, fase, estado y archivos modificados.
- Actualizar `AI_CONTEXT.md` si hubo cambios de arquitectura, endpoints, modelo de auth, conexion DB, convenciones o restricciones.
- Mantener una lista clara de funcionalidades terminadas y pendientes.
- Registrar la siguiente fase recomendada.
