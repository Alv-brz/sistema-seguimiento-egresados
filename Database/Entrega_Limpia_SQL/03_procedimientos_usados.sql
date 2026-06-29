USE seg_egresado_bolsa;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_registrar_empresa $$
CREATE PROCEDURE sp_registrar_empresa(IN p_id_usuario INT, IN p_ruc CHAR(11), IN p_razon_social VARCHAR(150), IN p_sector VARCHAR(100))
BEGIN
    INSERT INTO empresa(id_usuario, ruc, razon_social, sector, direccion)
    VALUES(p_id_usuario, p_ruc, p_razon_social, p_sector, 'Sin direccion');
END $$

DROP PROCEDURE IF EXISTS sp_actualizar_empresa $$
CREATE PROCEDURE sp_actualizar_empresa(IN p_id_empresa INT, IN p_telefono VARCHAR(15), IN p_pagina_web VARCHAR(100))
BEGIN
    UPDATE empresa SET telefono = p_telefono, pagina_web = p_pagina_web
    WHERE id_usuario = p_id_empresa;
END $$

DROP PROCEDURE IF EXISTS sp_registrar_egresado $$
CREATE PROCEDURE sp_registrar_egresado(IN p_id_usuario INT, IN p_dni CHAR(8), IN p_nombre VARCHAR(100), IN p_apellidos VARCHAR(100), IN p_carrera INT)
BEGIN
    INSERT INTO egresado(id_usuario, dni, nombre_egresado, apellidos_egresado, fecha_egreso, sexo, id_carrera)
    VALUES(p_id_usuario, p_dni, p_nombre, p_apellidos, CURDATE(), 'M', p_carrera);
END $$

DROP PROCEDURE IF EXISTS sp_actualizar_egresado $$
CREATE PROCEDURE sp_actualizar_egresado(IN p_id_egresado INT, IN p_telefono VARCHAR(15), IN p_direccion VARCHAR(255))
BEGIN
    UPDATE egresado SET telefono = p_telefono, direccion = p_direccion
    WHERE id_usuario = p_id_egresado;
END $$

DROP PROCEDURE IF EXISTS sp_cambiar_estado_egresado_seguro $$
CREATE PROCEDURE sp_cambiar_estado_egresado_seguro(IN p_id_egresado INT, IN p_estado VARCHAR(20))
BEGIN
    IF p_estado NOT IN ('Activo','Inactivo') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Estado de usuario invalido. Solo Activo o Inactivo';
    END IF;

    UPDATE usuario u
    INNER JOIN egresado e ON e.id_usuario = u.id_usuario
    SET u.estado_usuario = p_estado
    WHERE u.id_usuario = p_id_egresado;
END $$

DROP PROCEDURE IF EXISTS sp_cambiar_estado_empresa_seguro $$
CREATE PROCEDURE sp_cambiar_estado_empresa_seguro(IN p_id_empresa INT, IN p_estado VARCHAR(20))
BEGIN
    IF p_estado NOT IN ('Activo','Inactivo') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Estado de usuario invalido. Solo Activo o Inactivo';
    END IF;

    UPDATE usuario u
    INNER JOIN empresa em ON em.id_usuario = u.id_usuario
    SET u.estado_usuario = p_estado
    WHERE u.id_usuario = p_id_empresa;
END $$

DROP PROCEDURE IF EXISTS sp_publicar_oferta $$
CREATE PROCEDURE sp_publicar_oferta(IN p_titulo VARCHAR(150), IN p_empresa INT, IN p_puesto VARCHAR(100), IN p_salario DECIMAL(10,2))
BEGIN
    INSERT INTO oferta_laboral(titulo, descripcion, puesto, area, ubicacion, modalidad, tipo_contrato, salario, requisitos, fecha_publicacion, fecha_cierre, estado_oferta, id_empresa)
    VALUES(p_titulo, 'Oferta laboral generada', p_puesto, 'General', 'Peru', 'Presencial', 'Indeterminado', p_salario, 'Experiencia minima', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'Activa', p_empresa);
END $$

DROP PROCEDURE IF EXISTS sp_actualizar_oferta $$
CREATE PROCEDURE sp_actualizar_oferta(IN p_id_oferta INT, IN p_salario DECIMAL(10,2), IN p_estado VARCHAR(20))
BEGIN
    UPDATE oferta_laboral SET salario = p_salario, estado_oferta = p_estado
    WHERE id_oferta = p_id_oferta;
END $$

DROP PROCEDURE IF EXISTS sp_cerrar_oferta $$
CREATE PROCEDURE sp_cerrar_oferta(IN p_id_oferta INT, IN p_empresa INT)
BEGIN
    UPDATE oferta_laboral SET estado_oferta = 'Cerrada'
    WHERE id_oferta = p_id_oferta AND id_empresa = p_empresa;
END $$

DROP PROCEDURE IF EXISTS sp_registrar_postulacion $$
CREATE PROCEDURE sp_registrar_postulacion(IN p_egresado INT, IN p_oferta INT, IN p_cv VARCHAR(255))
BEGIN
    INSERT INTO postulacion(id_egresado, id_oferta, fecha_postulacion, estado_postulacion, cv_adjunto)
    VALUES(p_egresado, p_oferta, NOW(), 'Pendiente', p_cv);
END $$

DROP PROCEDURE IF EXISTS sp_cambiar_estado_postulacion $$
CREATE PROCEDURE sp_cambiar_estado_postulacion(IN p_postulacion INT, IN p_estado VARCHAR(20))
BEGIN
    UPDATE postulacion SET estado_postulacion = p_estado
    WHERE id_postulacion = p_postulacion;
END $$

DROP PROCEDURE IF EXISTS sp_registrar_encuesta $$
CREATE PROCEDURE sp_registrar_encuesta(IN p_estado_laboral VARCHAR(50), IN p_empresa_actual VARCHAR(150), IN p_cargo_actual VARCHAR(100), IN p_sueldo DECIMAL(10,2))
BEGIN
    INSERT INTO encuesta_seguimiento(fecha_registro, estado_laboral, nombre_empresa_actual, cargo_actual, sueldo_mensual)
    VALUES(CURDATE(), p_estado_laboral, p_empresa_actual, p_cargo_actual, p_sueldo);
END $$

DROP PROCEDURE IF EXISTS sp_asociar_encuesta_egresado $$
CREATE PROCEDURE sp_asociar_encuesta_egresado(IN p_encuesta INT, IN p_egresado INT)
BEGIN
    INSERT INTO seguimiento_egresado(id_encuesta, id_egresado, fecha_asociacion)
    VALUES(p_encuesta, p_egresado, NOW());
END $$

DROP PROCEDURE IF EXISTS sp_postulaciones_por_empresa $$
CREATE PROCEDURE sp_postulaciones_por_empresa(IN p_empresa INT, IN p_estado VARCHAR(20))
BEGIN
    SELECT em.razon_social, o.titulo, CONCAT(e.nombre_egresado,' ',e.apellidos_egresado) AS egresado,
           p.fecha_postulacion, p.estado_postulacion
    FROM empresa em
    INNER JOIN oferta_laboral o ON em.id_usuario = o.id_empresa
    INNER JOIN postulacion p ON o.id_oferta = p.id_oferta
    INNER JOIN egresado e ON p.id_egresado = e.id_usuario
    WHERE em.id_usuario = p_empresa AND p.estado_postulacion = p_estado;
END $$

DROP PROCEDURE IF EXISTS sp_egresados_por_carrera $$
CREATE PROCEDURE sp_egresados_por_carrera(IN p_carrera INT, IN p_sexo CHAR(1))
BEGIN
    SELECT e.id_usuario, e.dni, CONCAT(e.nombre_egresado,' ',e.apellidos_egresado) AS egresado,
           c.nombre_carrera, e.sexo
    FROM egresado e
    INNER JOIN carrera c ON e.id_carrera = c.id_carrera
    WHERE c.id_carrera = p_carrera AND e.sexo = p_sexo;
END $$

DELIMITER ;
