USE seg_egresado_bolsa;

DELIMITER $$

DROP TRIGGER IF EXISTS tr_aud_egresado_insert $$
CREATE TRIGGER tr_aud_egresado_insert AFTER INSERT ON egresado FOR EACH ROW
BEGIN
    INSERT INTO auditoria(tabla_afectada, accion, id_registro, descripcion, usuario_bd)
    VALUES('egresado','INSERT',NEW.id_usuario,CONCAT('Nuevo egresado registrado: ',NEW.nombre_egresado,' ',NEW.apellidos_egresado),USER());
END $$

DROP TRIGGER IF EXISTS tr_aud_egresado_update $$
CREATE TRIGGER tr_aud_egresado_update AFTER UPDATE ON egresado FOR EACH ROW
BEGIN
    INSERT INTO auditoria(tabla_afectada, accion, id_registro, descripcion, usuario_bd)
    VALUES('egresado','UPDATE',NEW.id_usuario,'Datos de egresado actualizados',USER());
END $$

DROP TRIGGER IF EXISTS tr_aud_empresa_insert $$
CREATE TRIGGER tr_aud_empresa_insert AFTER INSERT ON empresa FOR EACH ROW
BEGIN
    INSERT INTO auditoria(tabla_afectada, accion, id_registro, descripcion, usuario_bd)
    VALUES('empresa','INSERT',NEW.id_usuario,CONCAT('Empresa registrada: ',NEW.razon_social),USER());
END $$

DROP TRIGGER IF EXISTS tr_aud_empresa_update $$
CREATE TRIGGER tr_aud_empresa_update AFTER UPDATE ON empresa FOR EACH ROW
BEGIN
    INSERT INTO auditoria(tabla_afectada, accion, id_registro, descripcion, usuario_bd)
    VALUES('empresa','UPDATE',NEW.id_usuario,'Empresa actualizada',USER());
END $$

DROP TRIGGER IF EXISTS tr_aud_oferta_insert $$
CREATE TRIGGER tr_aud_oferta_insert AFTER INSERT ON oferta_laboral FOR EACH ROW
BEGIN
    INSERT INTO auditoria(tabla_afectada, accion, id_registro, descripcion, usuario_bd)
    VALUES('oferta_laboral','INSERT',NEW.id_oferta,CONCAT('Oferta creada: ',NEW.titulo),USER());
END $$

DROP TRIGGER IF EXISTS tr_aud_oferta_update $$
CREATE TRIGGER tr_aud_oferta_update AFTER UPDATE ON oferta_laboral FOR EACH ROW
BEGIN
    INSERT INTO auditoria(tabla_afectada, accion, id_registro, descripcion, usuario_bd)
    VALUES('oferta_laboral','UPDATE',NEW.id_oferta,'Oferta laboral actualizada',USER());
END $$

DROP TRIGGER IF EXISTS tr_aud_oferta_delete $$
CREATE TRIGGER tr_aud_oferta_delete AFTER DELETE ON oferta_laboral FOR EACH ROW
BEGIN
    INSERT INTO auditoria(tabla_afectada, accion, id_registro, descripcion, usuario_bd)
    VALUES('oferta_laboral','DELETE',OLD.id_oferta,'Oferta laboral eliminada',USER());
END $$

DROP TRIGGER IF EXISTS tr_aud_postulacion_insert $$
CREATE TRIGGER tr_aud_postulacion_insert AFTER INSERT ON postulacion FOR EACH ROW
BEGIN
    INSERT INTO auditoria(tabla_afectada, accion, id_registro, descripcion, usuario_bd)
    VALUES('postulacion','INSERT',NEW.id_postulacion,'Nueva postulacion registrada',USER());
END $$

DROP TRIGGER IF EXISTS tr_aud_usuario_estado_update $$
CREATE TRIGGER tr_aud_usuario_estado_update AFTER UPDATE ON usuario FOR EACH ROW
BEGIN
    IF OLD.estado_usuario <> NEW.estado_usuario THEN
        INSERT INTO auditoria(tabla_afectada, accion, id_registro, descripcion, usuario_bd)
        VALUES('usuario','UPDATE',NEW.id_usuario,CONCAT('Estado de usuario actualizado de ',OLD.estado_usuario,' a ',NEW.estado_usuario),USER());
    END IF;
END $$

DROP TRIGGER IF EXISTS tr_aud_historial_laboral_delete $$
CREATE TRIGGER tr_aud_historial_laboral_delete AFTER DELETE ON historial_laboral FOR EACH ROW
BEGIN
    INSERT INTO auditoria(tabla_afectada, accion, id_registro, descripcion, usuario_bd)
    VALUES('historial_laboral','DELETE',OLD.id_historial,CONCAT('Historial laboral eliminado: ',OLD.nombre_empresa,' - ',OLD.cargo),USER());
END $$

DELIMITER ;
