# AI Context - Sistema de Seguimiento de Egresados y Bolsa de Trabajo

## Descripción del Proyecto

Sistema web desarrollado para la Universidad de Huánuco (UDH) orientado al seguimiento de egresados y la gestión de bolsa de trabajo institucional.

El sistema integra:

- Frontend React + Vite + TypeScript
- Backend Node.js + Express + TypeScript
- Base de datos MySQL
- Objetos SQL avanzados
- Reportes PDF y Excel
- Autenticación JWT
- Control de acceso por roles

---

# Objetivo

Centralizar el seguimiento de egresados, conectar empresas con profesionales egresados y generar información estadística mediante dashboards y reportes institucionales.

---

# Roles

Administrador

Puede:

- Administrar egresados
- Administrar empresas
- Administrar ofertas
- Consultar auditoría
- Configuración del sistema
- Evidencias SQL
- Exportar PDF y Excel
- Ver dashboards

Empresa

Puede:

- Administrar sus ofertas
- Gestionar postulaciones
- Editar perfil
- Ver dashboard propio
- Recibir notificaciones

Egresado

Puede:

- Buscar ofertas
- Postular
- Completar encuestas
- Editar perfil
- Historial laboral
- Dashboard personal

---

# Arquitectura

Frontend

React
Vite
TypeScript
Tailwind
shadcn/ui

↓

API REST

↓

Express

↓

Controllers

↓

Services

↓

MySQL

↓

Triggers
Funciones
Procedimientos
Vistas

---

# Tecnologías

Frontend

- React
- TypeScript
- TailwindCSS
- Vite
- shadcn/ui

Backend

- Node.js
- Express
- TypeScript
- JWT

Base de datos

- MySQL

Reportes

- PDF
- Excel

---

# Objetos SQL

El proyecto utiliza

- 10 vistas
- 10 funciones
- 14 procedimientos almacenados
- 10 triggers de auditoría
- 15 triggers SIGNAL
- Roles MySQL
- Configuración del sistema

Los procedimientos almacenados son utilizados desde el backend mediante CALL.

Las validaciones de negocio importantes se realizan mediante triggers SIGNAL.

La auditoría es automática mediante triggers.

---

# Seguridad

Autenticación JWT.

Middleware:

- requireAuth
- requireRole

Roles:

- admin
- empresa
- egresado

El JWT almacena:

- id_usuario
- role

---

# Reportes

Actualmente soporta:

- PDF institucional
- Excel institucional

Los reportes contienen:

- Logo UDH
- Encabezado institucional
- Resumen ejecutivo
- Tablas
- Estadísticas
- Dashboards

---

# Flujo General

Usuario

↓

Pantalla React

↓

api.ts

↓

Express

↓

Controller

↓

Service

↓

SQL

↓

Triggers

↓

Respuesta JSON

---

# Convenciones del Proyecto

Mantener arquitectura por módulos.

No mezclar lógica SQL con componentes React.

Los procedimientos almacenados son la primera opción para operaciones complejas.

Las validaciones críticas deben permanecer en MySQL mediante SIGNAL.

Los triggers de auditoría nunca deben eliminarse.

---

# Organización

Frontend

src/

Backend

backend/src/

Base de datos

Database/

Documentación

Docs/

---

# Estado General

Proyecto terminado.

Se mantiene únicamente mantenimiento correctivo, mejoras visuales y optimizaciones sin alterar la arquitectura principal.
