USE seg_egresado_bolsa;

CREATE TABLE configuracion_sistema (
    id_configuracion TINYINT UNSIGNED PRIMARY KEY NOT NULL DEFAULT 1,
    nombre_universidad VARCHAR(150) NOT NULL DEFAULT 'Universidad de Huanuco (UDH)',
    correo_institucional VARCHAR(100) NOT NULL DEFAULT 'egresados@udh.edu.pe',
    telefono VARCHAR(20),
    logo_url VARCHAR(255),
    tiempo_entre_encuestas_meses TINYINT NOT NULL DEFAULT 6,
    estado_sistema VARCHAR(20) NOT NULL DEFAULT 'Activo',
    version_sistema VARCHAR(20) NOT NULL DEFAULT 'v1.0.0',
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DELIMITER $$

/* ==========================================
   VALIDACIONES CONFIGURACION SISTEMA
========================================== */

DROP TRIGGER IF EXISTS tr_configuracion_sistema_insert $$

CREATE TRIGGER tr_configuracion_sistema_insert
BEFORE INSERT ON configuracion_sistema
FOR EACH ROW
BEGIN

    IF NEW.id_configuracion <> 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='La configuracion del sistema debe usar id_configuracion = 1';
    END IF;

    IF NEW.correo_institucional NOT LIKE '%@%.%' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Formato de correo institucional invalido';
    END IF;

    IF NEW.tiempo_entre_encuestas_meses < 0
       OR NEW.tiempo_entre_encuestas_meses > 24 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='El tiempo entre encuestas debe estar entre 0 y 24 meses';
    END IF;

    IF NEW.estado_sistema NOT IN ('Activo','Inactivo') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Estado del sistema invalido';
    END IF;

END $$

DROP TRIGGER IF EXISTS tr_configuracion_sistema_update $$

CREATE TRIGGER tr_configuracion_sistema_update
BEFORE UPDATE ON configuracion_sistema
FOR EACH ROW
BEGIN

    IF NEW.id_configuracion <> 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='La configuracion del sistema debe usar id_configuracion = 1';
    END IF;

    IF NEW.correo_institucional NOT LIKE '%@%.%' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Formato de correo institucional invalido';
    END IF;

    IF NEW.tiempo_entre_encuestas_meses < 0
       OR NEW.tiempo_entre_encuestas_meses > 24 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='El tiempo entre encuestas debe estar entre 0 y 24 meses';
    END IF;

    IF NEW.estado_sistema NOT IN ('Activo','Inactivo') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Estado del sistema invalido';
    END IF;

END $$

/* ==========================================
   AUDITORIA CONFIGURACION SISTEMA
========================================== */

DROP TRIGGER IF EXISTS tr_aud_configuracion_sistema_insert $$

CREATE TRIGGER tr_aud_configuracion_sistema_insert
AFTER INSERT ON configuracion_sistema
FOR EACH ROW
BEGIN

    INSERT INTO auditoria(
        tabla_afectada,
        accion,
        id_registro,
        descripcion,
        usuario_bd
    )
    VALUES(
        'configuracion_sistema',
        'INSERT',
        NEW.id_configuracion,
        'Configuracion del sistema registrada',
        USER()
    );

END $$

DROP TRIGGER IF EXISTS tr_aud_configuracion_sistema_update $$

CREATE TRIGGER tr_aud_configuracion_sistema_update
AFTER UPDATE ON configuracion_sistema
FOR EACH ROW
BEGIN

    INSERT INTO auditoria(
        tabla_afectada,
        accion,
        id_registro,
        descripcion,
        usuario_bd
    )
    VALUES(
        'configuracion_sistema',
        'UPDATE',
        NEW.id_configuracion,
        'Configuracion del sistema actualizada',
        USER()
    );

END $$

DELIMITER ;

INSERT INTO configuracion_sistema (
    id_configuracion,
    nombre_universidad,
    correo_institucional,
    telefono,
    logo_url,
    tiempo_entre_encuestas_meses,
    estado_sistema,
    version_sistema
)
VALUES (
    1,
    'Universidad de Huanuco (UDH)',
    'egresados@udh.edu.pe',
    '(062) 512-604',
    NULL,
    6,
    'Activo',
    'v1.0.0'
);
