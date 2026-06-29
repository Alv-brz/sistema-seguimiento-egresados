USE seg_egresado_bolsa;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_cambiar_estado_egresado_seguro $$
CREATE PROCEDURE sp_cambiar_estado_egresado_seguro(
    IN p_id_egresado INT,
    IN p_estado VARCHAR(20)
)
BEGIN
    IF p_estado NOT IN ('Activo','Inactivo') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Estado de usuario invalido. Solo Activo o Inactivo';
    END IF;

    UPDATE usuario u
    INNER JOIN egresado e
        ON e.id_usuario = u.id_usuario
    SET u.estado_usuario = p_estado
    WHERE u.id_usuario = p_id_egresado;
END $$

DROP PROCEDURE IF EXISTS sp_cambiar_estado_empresa_seguro $$
CREATE PROCEDURE sp_cambiar_estado_empresa_seguro(
    IN p_id_empresa INT,
    IN p_estado VARCHAR(20)
)
BEGIN
    IF p_estado NOT IN ('Activo','Inactivo') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Estado de usuario invalido. Solo Activo o Inactivo';
    END IF;

    UPDATE usuario u
    INNER JOIN empresa em
        ON em.id_usuario = u.id_usuario
    SET u.estado_usuario = p_estado
    WHERE u.id_usuario = p_id_empresa;
END $$

DROP TRIGGER IF EXISTS tr_estado_usuario_update_signal $$
CREATE TRIGGER tr_estado_usuario_update_signal
BEFORE UPDATE ON usuario
FOR EACH ROW
BEGIN
    IF NEW.estado_usuario NOT IN ('Activo','Inactivo') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Estado de usuario invalido. Solo Activo o Inactivo';
    END IF;
END $$

DROP TRIGGER IF EXISTS tr_aud_usuario_estado_update $$
CREATE TRIGGER tr_aud_usuario_estado_update
AFTER UPDATE ON usuario
FOR EACH ROW
BEGIN
    IF OLD.estado_usuario <> NEW.estado_usuario THEN
        INSERT INTO auditoria(
            tabla_afectada,
            accion,
            id_registro,
            descripcion,
            usuario_bd
        )
        VALUES(
            'usuario',
            'UPDATE',
            NEW.id_usuario,
            CONCAT('Estado de usuario actualizado de ', OLD.estado_usuario, ' a ', NEW.estado_usuario),
            USER()
        );
    END IF;
END $$

DROP TRIGGER IF EXISTS tr_aud_historial_laboral_delete $$
CREATE TRIGGER tr_aud_historial_laboral_delete
AFTER DELETE ON historial_laboral
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
        'historial_laboral',
        'DELETE',
        OLD.id_historial,
        CONCAT('Historial laboral eliminado: ', OLD.nombre_empresa, ' - ', OLD.cargo),
        USER()
    );
END $$

DELIMITER ;
