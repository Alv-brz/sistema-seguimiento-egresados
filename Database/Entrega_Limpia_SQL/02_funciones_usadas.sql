USE seg_egresado_bolsa;

DELIMITER $$

DROP FUNCTION IF EXISTS fn_total_postulaciones $$
CREATE FUNCTION fn_total_postulaciones(p_id_egresado INT)
RETURNS INT DETERMINISTIC
BEGIN
    DECLARE total INT;
    SELECT COUNT(*) INTO total FROM postulacion WHERE id_egresado = p_id_egresado;
    RETURN total;
END $$

DROP FUNCTION IF EXISTS fn_total_ofertas_empresa $$
CREATE FUNCTION fn_total_ofertas_empresa(p_id_empresa INT)
RETURNS INT DETERMINISTIC
BEGIN
    DECLARE total INT;
    SELECT COUNT(*) INTO total FROM oferta_laboral WHERE id_empresa = p_id_empresa;
    RETURN total;
END $$

DROP FUNCTION IF EXISTS fn_promedio_salario $$
CREATE FUNCTION fn_promedio_salario(p_id_egresado INT)
RETURNS DECIMAL(10,2) DETERMINISTIC
BEGIN
    DECLARE promedio DECIMAL(10,2);
    SELECT AVG(salario) INTO promedio FROM historial_laboral WHERE id_egresado = p_id_egresado;
    RETURN IFNULL(promedio,0);
END $$

DROP FUNCTION IF EXISTS fn_nombre_completo $$
CREATE FUNCTION fn_nombre_completo(p_id_egresado INT)
RETURNS VARCHAR(250) DETERMINISTIC
BEGIN
    DECLARE nombre_completo VARCHAR(250);
    SELECT CONCAT(nombre_egresado,' ',apellidos_egresado) INTO nombre_completo
    FROM egresado WHERE id_usuario = p_id_egresado;
    RETURN nombre_completo;
END $$

DROP FUNCTION IF EXISTS fn_nombre_carrera $$
CREATE FUNCTION fn_nombre_carrera(p_id_carrera INT)
RETURNS VARCHAR(100) DETERMINISTIC
BEGIN
    DECLARE carrera_nombre VARCHAR(100);
    SELECT nombre_carrera INTO carrera_nombre FROM carrera WHERE id_carrera = p_id_carrera;
    RETURN carrera_nombre;
END $$

DROP FUNCTION IF EXISTS fn_nombre_empresa $$
CREATE FUNCTION fn_nombre_empresa(p_id_empresa INT)
RETURNS VARCHAR(150) DETERMINISTIC
BEGIN
    DECLARE empresa_nombre VARCHAR(150);
    SELECT razon_social INTO empresa_nombre FROM empresa WHERE id_usuario = p_id_empresa;
    RETURN empresa_nombre;
END $$

DROP FUNCTION IF EXISTS fn_total_egresados_carrera $$
CREATE FUNCTION fn_total_egresados_carrera(p_id_carrera INT)
RETURNS INT DETERMINISTIC
BEGIN
    DECLARE total INT;
    SELECT COUNT(*) INTO total FROM egresado WHERE id_carrera = p_id_carrera;
    RETURN total;
END $$

DROP FUNCTION IF EXISTS fn_total_encuestas $$
CREATE FUNCTION fn_total_encuestas()
RETURNS INT DETERMINISTIC
BEGIN
    DECLARE total INT;
    SELECT COUNT(*) INTO total FROM encuesta_seguimiento;
    RETURN total;
END $$

DROP FUNCTION IF EXISTS fn_estado_laboral_actual $$
CREATE FUNCTION fn_estado_laboral_actual(p_id_egresado INT)
RETURNS VARCHAR(50) DETERMINISTIC
BEGIN
    DECLARE estado_lab VARCHAR(50);
    SELECT es.estado_laboral INTO estado_lab
    FROM encuesta_seguimiento es
    INNER JOIN seguimiento_egresado se ON es.id_encuesta = se.id_encuesta
    WHERE se.id_egresado = p_id_egresado
    ORDER BY es.id_encuesta DESC
    LIMIT 1;
    RETURN estado_lab;
END $$

DROP FUNCTION IF EXISTS fn_ultima_empresa $$
CREATE FUNCTION fn_ultima_empresa(p_id_egresado INT)
RETURNS VARCHAR(150) DETERMINISTIC
BEGIN
    DECLARE empresa_nombre VARCHAR(150);
    SELECT nombre_empresa INTO empresa_nombre
    FROM historial_laboral
    WHERE id_egresado = p_id_egresado
    ORDER BY fecha_inicio DESC
    LIMIT 1;
    RETURN empresa_nombre;
END $$

DELIMITER ;
