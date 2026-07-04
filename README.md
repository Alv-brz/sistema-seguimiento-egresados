# Sistema de Seguimiento de Egresados y Bolsa de Trabajo

## Descripción

El Sistema de Seguimiento de Egresados y Bolsa de Trabajo es una aplicación web desarrollada para la Universidad de Huánuco (UDH), orientada a fortalecer el vínculo entre la universidad, sus egresados y las empresas.

La plataforma permite gestionar información de egresados, empresas, ofertas laborales, postulaciones, encuestas de seguimiento y reportes institucionales, incorporando una base de datos con procedimientos almacenados, funciones, vistas y triggers para garantizar la integridad y automatización de los procesos.

---

# Características

- Gestión de egresados.
- Gestión de empresas.
- Gestión de ofertas laborales.
- Gestión de postulaciones.
- Encuestas de seguimiento.
- Historial laboral.
- Dashboard con indicadores.
- Reportes en PDF, Excel y CSV.
- Autenticación mediante JWT.
- Control de acceso por roles.
- Auditoría automática mediante triggers.
- Procedimientos almacenados para operaciones de negocio.
- Funciones y vistas SQL para consultas avanzadas.

---

# Arquitectura

```
Frontend (React + TypeScript)
            │
            ▼
      API REST (Express)
            │
            ▼
     Servicios y Controladores
            │
            ▼
          MySQL
            │
            ▼
Procedimientos • Funciones • Vistas • Triggers
```

---

# Tecnologías Utilizadas

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

## Backend

- Node.js
- Express
- TypeScript
- JWT

## Base de Datos

- MySQL

## Reportes

- PDF
- Excel
- CSV

---

# Estructura del Proyecto

```
backend/
    API REST

src/
    Frontend React

Database/
    Scripts SQL

Public/
    Recursos públicos

Docs/
    Documentación técnica
```

---

# Instalación

## 1. Clonar el repositorio

```bash
git clone https://github.com/Alv-brz/sistema-seguimiento-egresados.git
cd sistema-seguimiento-egresados
```

---

## 2. Instalar dependencias

### Frontend

```bash
npm install
```

### Backend

```bash
cd backend
npm install
cd ..
```

---

## 3. Configurar la Base de Datos

Crear una base de datos MySQL e importar los scripts ubicados en la carpeta:

```
Database/
```

Posteriormente configurar las credenciales del archivo `.env` del backend.

Ejemplo:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=admin_general
DB_PASSWORD=********
DB_NAME=seg_egresado_bolsa

JWT_SECRET=********
```

---

# Ejecución del Sistema

## Frontend

Desde la raíz del proyecto:

```bash
npm run dev
```

Aplicación disponible en:

```
http://localhost:5173
```

---

## Backend

Abrir una nueva terminal:

```bash
cd backend
npm run dev
```

API disponible en:

```
http://localhost:3001
```

---

# Scripts Disponibles

## Frontend

```bash
npm run dev
npm run build
npm run preview
```

## Backend

```bash
npm run dev
npm run build
npm start
```

---

# Roles del Sistema

## Administrador

Permisos completos sobre:

- Usuarios
- Empresas
- Egresados
- Ofertas
- Reportes
- Configuración
- Auditoría

---

## Empresa

Puede:

- Administrar sus ofertas laborales.
- Gestionar postulaciones.
- Editar su perfil.
- Consultar su información.

---

## Egresado

Puede:

- Buscar ofertas.
- Postular.
- Gestionar su perfil.
- Registrar historial laboral.
- Completar encuestas.
- Consultar su información.

---

# Base de Datos

La solución implementa objetos avanzados de MySQL:

- Procedimientos almacenados
- Funciones
- Vistas
- Triggers de auditoría
- Triggers de validación
- Roles
- Índices
- Restricciones

Estos objetos son utilizados desde el backend mediante llamadas SQL para centralizar la lógica de negocio.

---

# Funcionalidades Principales

- Gestión de usuarios.
- Gestión de egresados.
- Gestión de empresas.
- Bolsa de trabajo.
- Postulaciones.
- Historial laboral.
- Encuestas de seguimiento.
- Dashboard ejecutivo.
- Reportes institucionales.
- Exportación PDF, Excel y CSV.
- Autenticación JWT.
- Control de acceso por roles.

---

# Capturas

Las capturas del sistema pueden incorporarse en esta sección para ilustrar las principales funcionalidades de la plataforma.

---

# Licencia

Proyecto desarrollado con fines académicos para la Universidad de Huánuco.
