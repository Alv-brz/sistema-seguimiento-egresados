DELIMITER $$

/* ==========================================
   1. DNI DEBE TENER 8 DIGITOS
========================================== */

DROP TRIGGER IF EXISTS tr_dni_8_digitos $$

CREATE TRIGGER tr_dni_8_digitos
BEFORE INSERT ON egresado
FOR EACH ROW
BEGIN

    IF LENGTH(NEW.dni) <> 8 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='El DNI debe tener 8 digitos';
    END IF;

END $$


/* ==========================================
   2. SEXO SOLO M O F
========================================== */

DROP TRIGGER IF EXISTS tr_sexo_valido $$

CREATE TRIGGER tr_sexo_valido
BEFORE INSERT ON egresado
FOR EACH ROW
BEGIN

    IF NEW.sexo NOT IN ('M','F') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Sexo invalido. Solo M o F';
    END IF;

END $$


/* ==========================================
   3. FECHA EGRESO NO FUTURA
========================================== */

DROP TRIGGER IF EXISTS tr_fecha_egreso $$

CREATE TRIGGER tr_fecha_egreso
BEFORE INSERT ON egresado
FOR EACH ROW
BEGIN

    IF NEW.fecha_egreso > CURDATE() THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='La fecha de egreso no puede ser futura';
    END IF;

END $$


/* ==========================================
   4. RUC DEBE TENER 11 DIGITOS
========================================== */

DROP TRIGGER IF EXISTS tr_ruc_11_digitos $$

CREATE TRIGGER tr_ruc_11_digitos
BEFORE INSERT ON empresa
FOR EACH ROW
BEGIN

    IF LENGTH(NEW.ruc) <> 11 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='El RUC debe tener 11 digitos';
    END IF;

END $$


/* ==========================================
   5. PAGINA WEB DEBE EMPEZAR CON WWW
========================================== */

DROP TRIGGER IF EXISTS tr_web_empresa $$

CREATE TRIGGER tr_web_empresa
BEFORE INSERT ON empresa
FOR EACH ROW
BEGIN

    IF NEW.pagina_web IS NOT NULL
       AND NEW.pagina_web NOT LIKE 'www.%' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='La pagina web debe iniciar con www.';
    END IF;

END $$

DELIMITER ;


DELIMITER $$

/* ==========================================
   6. SALARIO DE OFERTA MAYOR A 0
========================================== */

DROP TRIGGER IF EXISTS tr_salario_oferta $$

CREATE TRIGGER tr_salario_oferta
BEFORE INSERT ON oferta_laboral
FOR EACH ROW
BEGIN

    IF NEW.salario IS NOT NULL
       AND NEW.salario <= 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='El salario debe ser mayor a 0';

    END IF;

END $$


/* ==========================================
   7. FECHA CIERRE MAYOR A FECHA PUBLICACION
========================================== */

DROP TRIGGER IF EXISTS tr_fecha_cierre_oferta $$

CREATE TRIGGER tr_fecha_cierre_oferta
BEFORE INSERT ON oferta_laboral
FOR EACH ROW
BEGIN

    IF NEW.fecha_cierre <= NEW.fecha_publicacion THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='La fecha de cierre debe ser mayor a la fecha de publicacion';

    END IF;

END $$


/* ==========================================
   8. ESTADO OFERTA VALIDO
========================================== */

DROP TRIGGER IF EXISTS tr_estado_oferta $$

CREATE TRIGGER tr_estado_oferta
BEFORE INSERT ON oferta_laboral
FOR EACH ROW
BEGIN

    IF NEW.estado_oferta NOT IN ('Activa','Cerrada') THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Estado de oferta invalido';

    END IF;

END $$


/* ==========================================
   9. SALARIO HISTORIAL NO NEGATIVO
========================================== */

DROP TRIGGER IF EXISTS tr_salario_historial $$

CREATE TRIGGER tr_salario_historial
BEFORE INSERT ON historial_laboral
FOR EACH ROW
BEGIN

    IF NEW.salario IS NOT NULL
       AND NEW.salario < 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='El salario no puede ser negativo';

    END IF;

END $$


/* ==========================================
   10. FECHA FIN MAYOR A FECHA INICIO
========================================== */

DROP TRIGGER IF EXISTS tr_fecha_historial $$

CREATE TRIGGER tr_fecha_historial
BEFORE INSERT ON historial_laboral
FOR EACH ROW
BEGIN

    IF NEW.fecha_fin IS NOT NULL
       AND NEW.fecha_fin < NEW.fecha_inicio THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='La fecha fin debe ser mayor que la fecha inicio';

    END IF;

END $$


DELIMITER $$

/* ==========================================
   11. ESTADO POSTULACION VALIDO
========================================== */

DROP TRIGGER IF EXISTS tr_estado_postulacion $$

CREATE TRIGGER tr_estado_postulacion
BEFORE INSERT ON postulacion
FOR EACH ROW
BEGIN

    IF NEW.estado_postulacion NOT IN
    ('Pendiente','Aceptado','Rechazado') THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Estado de postulacion invalido';

    END IF;

END $$


/* ==========================================
   12. FECHA POSTULACION NO FUTURA
========================================== */

DROP TRIGGER IF EXISTS tr_fecha_postulacion $$

CREATE TRIGGER tr_fecha_postulacion
BEFORE INSERT ON postulacion
FOR EACH ROW
BEGIN

    IF NEW.fecha_postulacion > NOW() THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='La fecha de postulacion no puede ser futura';

    END IF;

END $$


/* ==========================================
   13. SUELDO ENCUESTA NO NEGATIVO
========================================== */

DROP TRIGGER IF EXISTS tr_sueldo_encuesta $$

CREATE TRIGGER tr_sueldo_encuesta
BEFORE INSERT ON encuesta_seguimiento
FOR EACH ROW
BEGIN

    IF NEW.sueldo_mensual IS NOT NULL
       AND NEW.sueldo_mensual < 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='El sueldo mensual no puede ser negativo';

    END IF;

END $$


/* ==========================================
   14. FECHA EXPIRACION MAYOR A HOY
========================================== */

DROP TRIGGER IF EXISTS tr_token_recuperacion $$

CREATE TRIGGER tr_token_recuperacion
BEFORE INSERT ON recuperacion_password
FOR EACH ROW
BEGIN

    IF NEW.fecha_expiracion <= NOW() THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='La fecha de expiracion debe ser futura';

    END IF;

END $$


/* ==========================================
   15. CORREO CON FORMATO BASICO
========================================== */

DROP TRIGGER IF EXISTS tr_correo_usuario $$

CREATE TRIGGER tr_correo_usuario
BEFORE INSERT ON usuario
FOR EACH ROW
BEGIN

    IF NEW.correo NOT LIKE '%@%.%' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Formato de correo invalido';

    END IF;

END $$

DELIMITER ;