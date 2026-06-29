# Entrega limpia SQL

Scripts finales para compartir la version operativa del sistema.

## Orden de ejecucion

1. Ejecutar el esquema base y datos del proyecto.
2. Ejecutar `01_vistas_usadas.sql`.
3. Ejecutar `02_funciones_usadas.sql`.
4. Ejecutar `03_procedimientos_usados.sql`.
5. Ejecutar `04_triggers_auditoria_usados.sql`.
6. Ejecutar `05_triggers_signal_usados.sql`.
7. Ejecutar `06_usuarios_permisos.sql`.

## Matriz final

- Vistas: 10 / 10
- Funciones: 10 / 10
- Procedimientos: 15 / 15
- Triggers auditoria: 10 / 10
- Triggers SIGNAL: 15 / 15
- Roles MySQL: 3 / 3

## Criterio de inclusion

Cada objeto incluido en esta carpeta esta conectado a endpoints reales del backend y participa en flujos operativos del aplicativo web: CRUD, dashboards, reportes, notificaciones, auditoria, validaciones y permisos.

Los scripts originales de `Database/` se conservan intactos como fuente inicial del proyecto. Esta carpeta contiene la seleccion final limpia para entrega.
