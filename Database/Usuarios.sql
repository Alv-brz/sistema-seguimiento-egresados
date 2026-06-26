/* ==========================================
   ROLES
========================================== */

CREATE ROLE rol_admin;
CREATE ROLE rol_empresa;
CREATE ROLE rol_egresado;


/* ==========================================
   PERMISOS ADMINISTRADOR
========================================== */

GRANT ALL PRIVILEGES
ON seg_egresado_bolsa.*
TO rol_admin;


/* ==========================================
   PERMISOS EMPRESA
========================================== */

GRANT SELECT, INSERT, UPDATE
ON seg_egresado_bolsa.oferta_laboral
TO rol_empresa;

GRANT SELECT
ON seg_egresado_bolsa.postulacion
TO rol_empresa;

GRANT SELECT
ON seg_egresado_bolsa.empresa
TO rol_empresa;


/* ==========================================
   PERMISOS EGRESADO
========================================== */

GRANT SELECT
ON seg_egresado_bolsa.oferta_laboral
TO rol_egresado;

GRANT SELECT, INSERT
ON seg_egresado_bolsa.postulacion
TO rol_egresado;

GRANT SELECT
ON seg_egresado_bolsa.egresado
TO rol_egresado;


/* ==========================================
   CREAR USUARIOS MYSQL
========================================== */

CREATE USER 'admin_general'@'localhost'
IDENTIFIED BY 'Admin123*';

CREATE USER 'empresa_user'@'localhost'
IDENTIFIED BY 'Empresa123*';

CREATE USER 'egresado_user'@'localhost'
IDENTIFIED BY 'Egresado123*';


/* ==========================================
   ASIGNAR ROLES
========================================== */

GRANT rol_admin
TO 'admin_general'@'localhost';

GRANT rol_empresa
TO 'empresa_user'@'localhost';

GRANT rol_egresado
TO 'egresado_user'@'localhost';


/* ==========================================
   ROL POR DEFECTO
========================================== */

SET DEFAULT ROLE rol_admin
TO 'admin_general'@'localhost';

SET DEFAULT ROLE rol_empresa
TO 'empresa_user'@'localhost';

SET DEFAULT ROLE rol_egresado
TO 'egresado_user'@'localhost';


/* ==========================================
   VERIFICAR PERMISOS
========================================== */

SHOW GRANTS FOR 'admin_general'@'localhost';

SHOW GRANTS FOR 'empresa_user'@'localhost';

SHOW GRANTS FOR 'egresado_user'@'localhost';