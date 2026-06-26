DELIMITER $$

DROP TRIGGER IF EXISTS tr_aud_egresado_insert $$

CREATE TRIGGER tr_aud_egresado_insert
AFTER INSERT ON egresado
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
        'egresado',
        'INSERT',
        NEW.id_usuario,
        CONCAT('Nuevo egresado registrado: ',NEW.nombre_egresado,' ',NEW.apellidos_egresado),
        USER()
    );

END $$

DELIMITER ;


DELIMITER $$

DROP TRIGGER IF EXISTS tr_aud_egresado_update $$

CREATE TRIGGER tr_aud_egresado_update
AFTER UPDATE ON egresado
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
        'egresado',
        'UPDATE',
        NEW.id_usuario,
        'Datos de egresado actualizados',
        USER()
    );

END $$

DELIMITER ;

DELIMITER $$

DROP TRIGGER IF EXISTS tr_aud_egresado_delete $$

CREATE TRIGGER tr_aud_egresado_delete
AFTER DELETE ON egresado
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
        'egresado',
        'DELETE',
        OLD.id_usuario,
        'Egresado eliminado',
        USER()
    );

END $$

DELIMITER ;

DELIMITER $$

DROP TRIGGER IF EXISTS tr_aud_empresa_insert $$

CREATE TRIGGER tr_aud_empresa_insert
AFTER INSERT ON empresa
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
        'empresa',
        'INSERT',
        NEW.id_usuario,
        CONCAT('Empresa registrada: ',NEW.razon_social),
        USER()
    );

END $$

DELIMITER ;

DELIMITER $$

DROP TRIGGER IF EXISTS tr_aud_empresa_update $$

CREATE TRIGGER tr_aud_empresa_update
AFTER UPDATE ON empresa
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
        'empresa',
        'UPDATE',
        NEW.id_usuario,
        'Empresa actualizada',
        USER()
    );

END $$

DELIMITER ;

DELIMITER $$

DROP TRIGGER IF EXISTS tr_aud_empresa_delete $$

CREATE TRIGGER tr_aud_empresa_delete
AFTER DELETE ON empresa
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
        'empresa',
        'DELETE',
        OLD.id_usuario,
        'Empresa eliminada',
        USER()
    );

END $$

DELIMITER ;

DELIMITER $$

DROP TRIGGER IF EXISTS tr_aud_oferta_insert $$

CREATE TRIGGER tr_aud_oferta_insert
AFTER INSERT ON oferta_laboral
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
        'oferta_laboral',
        'INSERT',
        NEW.id_oferta,
        CONCAT('Oferta creada: ',NEW.titulo),
        USER()
    );

END $$

DELIMITER ;

DELIMITER $$

DROP TRIGGER IF EXISTS tr_aud_oferta_update $$

CREATE TRIGGER tr_aud_oferta_update
AFTER UPDATE ON oferta_laboral
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
        'oferta_laboral',
        'UPDATE',
        NEW.id_oferta,
        'Oferta laboral actualizada',
        USER()
    );

END $$

DELIMITER ;

DELIMITER $$

DROP TRIGGER IF EXISTS tr_aud_oferta_delete $$

CREATE TRIGGER tr_aud_oferta_delete
AFTER DELETE ON oferta_laboral
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
        'oferta_laboral',
        'DELETE',
        OLD.id_oferta,
        'Oferta laboral eliminada',
        USER()
    );

END $$

DELIMITER ;

DELIMITER $$

DROP TRIGGER IF EXISTS tr_aud_postulacion_insert $$

CREATE TRIGGER tr_aud_postulacion_insert
AFTER INSERT ON postulacion
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
        'postulacion',
        'INSERT',
        NEW.id_postulacion,
        'Nueva postulacion registrada',
        USER()
    );

END $$

DELIMITER ;