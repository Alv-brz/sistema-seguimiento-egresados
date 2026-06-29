USE seg_egresado_bolsa;

CREATE OR REPLACE VIEW vw_egresados_carrera_facultad AS
SELECT e.id_usuario, e.dni, e.nombre_egresado, e.apellidos_egresado,
       c.nombre_carrera, f.nombre_facultad, e.fecha_egreso
FROM egresado e
INNER JOIN carrera c ON e.id_carrera = c.id_carrera
INNER JOIN facultad f ON c.id_facultad = f.id_facultad;

CREATE OR REPLACE VIEW vw_empresa_ofertas AS
SELECT em.id_usuario, em.razon_social, o.id_oferta, o.titulo, o.puesto,
       o.salario, o.estado_oferta
FROM empresa em
INNER JOIN oferta_laboral o ON em.id_usuario = o.id_empresa;

CREATE OR REPLACE VIEW vw_postulaciones_completas AS
SELECT p.id_postulacion, CONCAT(e.nombre_egresado,' ',e.apellidos_egresado) AS egresado,
       o.titulo, p.fecha_postulacion, p.estado_postulacion
FROM postulacion p
INNER JOIN egresado e ON p.id_egresado = e.id_usuario
INNER JOIN oferta_laboral o ON p.id_oferta = o.id_oferta;

CREATE OR REPLACE VIEW vw_historial_laboral_completo AS
SELECT h.id_historial, CONCAT(e.nombre_egresado,' ',e.apellidos_egresado) AS egresado,
       h.nombre_empresa, h.cargo, h.salario, h.modalidad, h.actual
FROM historial_laboral h
INNER JOIN egresado e ON h.id_egresado = e.id_usuario;

CREATE OR REPLACE VIEW vw_encuestas_egresados AS
SELECT se.id_seguimiento, CONCAT(e.nombre_egresado,' ',e.apellidos_egresado) AS egresado,
       es.estado_laboral, es.nombre_empresa_actual, es.cargo_actual, es.sueldo_mensual
FROM seguimiento_egresado se
INNER JOIN egresado e ON se.id_egresado = e.id_usuario
INNER JOIN encuesta_seguimiento es ON se.id_encuesta = es.id_encuesta;

CREATE OR REPLACE VIEW vw_egresados_empleados AS
SELECT CONCAT(e.nombre_egresado,' ',e.apellidos_egresado) AS egresado,
       es.nombre_empresa_actual, es.cargo_actual, es.sueldo_mensual
FROM seguimiento_egresado se
INNER JOIN egresado e ON se.id_egresado = e.id_usuario
INNER JOIN encuesta_seguimiento es ON se.id_encuesta = es.id_encuesta
WHERE es.estado_laboral = 'Empleado';

CREATE OR REPLACE VIEW vw_ofertas_activas AS
SELECT o.id_oferta, o.titulo, o.puesto, o.salario, em.razon_social
FROM oferta_laboral o
INNER JOIN empresa em ON o.id_empresa = em.id_usuario
WHERE o.estado_oferta = 'Activa';

CREATE OR REPLACE VIEW vw_cantidad_ofertas_empresa AS
SELECT em.id_usuario, em.razon_social, COUNT(o.id_oferta) AS total_ofertas
FROM empresa em
LEFT JOIN oferta_laboral o ON em.id_usuario = o.id_empresa
GROUP BY em.id_usuario, em.razon_social;

CREATE OR REPLACE VIEW vw_postulaciones_por_oferta AS
SELECT o.id_oferta, o.titulo, COUNT(p.id_postulacion) AS total_postulaciones
FROM oferta_laboral o
LEFT JOIN postulacion p ON o.id_oferta = p.id_oferta
GROUP BY o.id_oferta, o.titulo;

CREATE OR REPLACE VIEW vw_promedio_salarial_carrera AS
SELECT c.nombre_carrera, ROUND(AVG(h.salario),2) AS promedio_salario
FROM historial_laboral h
INNER JOIN egresado e ON h.id_egresado = e.id_usuario
INNER JOIN carrera c ON e.id_carrera = c.id_carrera
GROUP BY c.nombre_carrera;
