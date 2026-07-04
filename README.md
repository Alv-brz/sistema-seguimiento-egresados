# Sistema de Seguimiento de Egresados y Bolsa de Trabajo

Sistema web desarrollado para la gestión de egresados universitarios y la administración de una bolsa de trabajo, permitiendo el seguimiento laboral, la publicación de ofertas, la gestión de empresas y la generación de reportes mediante una arquitectura cliente-servidor.

---

## Descripción

El sistema permite administrar de forma centralizada la información de egresados, empresas, ofertas laborales, postulaciones y encuestas de seguimiento, proporcionando herramientas para la toma de decisiones mediante reportes y paneles estadísticos.

---

## Funcionalidades

- Gestión de egresados.
- Gestión de empresas.
- Gestión de ofertas laborales.
- Gestión de postulaciones.
- Gestión de usuarios.
- Sistema de autenticación.
- Control de acceso por roles.
- Dashboard ejecutivo.
- Reportes estadísticos.
- Exportación de información en CSV, Excel y PDF.
- Sistema de notificaciones.
- Encuestas de seguimiento.
- Procedimientos almacenados.
- Funciones SQL.
- Triggers.
- Vistas de base de datos.

---

## Arquitectura

```
Frontend (React + TypeScript)
            │
            ▼
      API REST (FastAPI)
            │
            ▼
     PostgreSQL
```

---

## Tecnologías

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

### Backend

- Python
- FastAPI
- SQLAlchemy

### Base de Datos

- PostgreSQL

---

## Estructura del Proyecto

```
backend/
Database/
Public/
guidelines/
src/
```

---

## Roles del Sistema

### Administrador

- Administración completa del sistema.
- Gestión de usuarios.
- Gestión de empresas.
- Gestión de egresados.
- Gestión de ofertas laborales.
- Configuración general.
- Reportes.

### Empresa

- Administración de ofertas laborales.
- Gestión de postulaciones.

### Egresado

- Actualización de información personal.
- Consulta de ofertas.
- Postulación a empleos.
- Respuesta de encuestas.

---

## Instalación

### Clonar el repositorio

```bash
git clone https://github.com/Alv-brz/sistema-seguimiento-egresados.git
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
npm install
npm run dev
```

---

## Capturas del Sistema

En esta sección pueden agregarse imágenes del:

- Dashboard.
- Gestión de Egresados.
- Gestión de Empresas.
- Bolsa de Trabajo.
- Reportes.
- Exportaciones.

---

## Autor

Álvaro Berrospi

Universidad de Huánuco

Ingeniería de Sistemas e Informática

---

## Licencia

Proyecto desarrollado con fines académicos.
