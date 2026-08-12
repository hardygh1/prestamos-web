# PROJECT_CONTEXT.md

# Sistema de Gestión de Préstamos

## Descripción

Aplicación web para la gestión de préstamos que consume una API REST desarrollada en Spring Boot.

Permite administrar clientes, cotizaciones, préstamos y pagos mediante una interfaz moderna e intuitiva.

La integración con el backend se realiza utilizando la documentación definida en `API_GUIDE.md`.

---

# Objetivo del Sistema

Permitir gestionar el ciclo de vida completo de un préstamo:

- Autenticación de usuarios.
- Gestión de clientes.
- Cotización de préstamos.
- Generación y aprobación de préstamos.
- Consulta de cuotas.
- Registro de pagos.
- Seguimiento del estado del préstamo.

---

# Usuarios del Sistema

## Administrador

- Acceso completo al sistema.
- Supervisión de operaciones.
- Gestión de usuarios y préstamos.

## Asesor

- Registro y actualización de clientes.
- Generación de cotizaciones.
- Registro de préstamos.
- Registro de pagos.
- Consulta de información.

---

# Módulos

- Autenticación
- Dashboard
- Clientes
- Cotizaciones
- Préstamos
- Pagos

---

# Flujo Principal

Login

↓

Dashboard

↓

Gestión de Clientes

↓

Generar Cotización

↓

Aprobar Cotización

↓

Generar Préstamo

↓

Consultar Cuotas

↓

Registrar Pagos

↓

Finalizar Préstamo

---

# Alcance Actual

La aplicación contempla:

- Inicio de sesión con JWT.
- Dashboard.
- CRUD de Clientes.
- Búsqueda, filtros, paginación y ordenamiento de clientes.
- Gestión de Cotizaciones.
- Aprobación de Cotizaciones.
- Gestión de Préstamos.
- Consulta de Cuotas.
- Registro e historial de Pagos.

---

# Integración con Backend

Toda la comunicación con el backend debe realizarse siguiendo la especificación definida en:

- API_GUIDE.md

Este documento contiene:

- Endpoints.
- Requests.
- Responses.
- Códigos HTTP.
- Reglas de integración.

Debe considerarse como la única fuente de verdad para la comunicación entre Frontend y Backend.

---

# Consideraciones

- Mantener una interfaz simple, consistente y responsive.
- Centralizar el consumo de la API.
- Reutilizar componentes cuando sea posible.
- Gestionar correctamente los estados de carga, validaciones y errores.
- Respetar la estructura y contratos definidos en `API_GUIDE.md`.