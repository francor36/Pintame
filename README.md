# 🎨 Pintame

Sistema de gestión empresarial desarrollado para una **pinturería**, orientado a centralizar y optimizar la gestión de clientes, ventas, stock, caja y facturación mediante una arquitectura basada en **microservicios**.

El proyecto busca proporcionar una plataforma escalable, modular y segura que permita administrar las principales operaciones de un comercio dedicado a la venta de pinturas, herramientas y productos relacionados.

---

## 📌 Descripción

**Pintame** es una aplicación web desarrollada para cubrir las necesidades administrativas y comerciales de una pinturería.

El sistema está diseñado para permitir la gestión de:

* 👥 Clientes
* 🛒 Ventas
* 📦 Stock y productos
* 💰 Caja
* 🧾 Facturación
* 🔐 Usuarios y autenticación
* 📊 Registro y seguimiento de operaciones

La aplicación utiliza una arquitectura de **microservicios**, donde cada módulo del sistema se encuentra separado y posee responsabilidades específicas.

Esto permite que cada servicio pueda desarrollarse, mantenerse y escalarse de manera independiente.

---

## 🎯 ¿Para quién está desarrollada?

Pintame está desarrollado principalmente para:

* Pinturerías.
* Comercios dedicados a la venta de pinturas.
* Comercios de materiales y herramientas.
* Pequeñas y medianas empresas que necesiten centralizar su gestión.

El sistema busca simplificar las tareas administrativas y comerciales que normalmente se realizan mediante diferentes sistemas o procesos manuales.

---

## 🚀 Objetivos del proyecto

Los principales objetivos de Pintame son:

* Centralizar la información del negocio.
* Mejorar la gestión de clientes y productos.
* Controlar el stock disponible.
* Registrar ventas y movimientos de caja.
* Gestionar facturación.
* Implementar autenticación y autorización mediante JWT.
* Utilizar una arquitectura escalable basada en microservicios.
* Separar la información utilizando diferentes tecnologías de almacenamiento.
* Proporcionar documentación interactiva de la API.
* Facilitar el mantenimiento y evolución del sistema.

---

# 🏗️ Arquitectura

Pintame utiliza una arquitectura basada en **microservicios**.

```text
                         ┌─────────────────────┐
                         │      Frontend       │
                         │    Vue / Web App    │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    API Gateway      │
                         │      :3000          │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
       ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
       │   Clientes  │       │    Ventas   │       │    Stock    │
       │    :3001    │       │    :3002    │       │    :3003    │
       └──────┬──────┘       └──────┬──────┘       └──────┬──────┘
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    │
                         ┌──────────┴──────────┐
                         │      Servicios     │
                         │  Caja / Facturación│
                         │  Auth / Users /Logs │
                         └─────────────────────┘
```

### Microservicios

| Servicio      | Responsabilidad                    |
| ------------- | ---------------------------------- |
| `api-gateway` | Punto de entrada de la aplicación  |
| `clientes`    | Gestión de clientes                |
| `ventas`      | Gestión de ventas                  |
| `stock`       | Gestión de productos y stock       |
| `caja`        | Gestión de caja y movimientos      |
| `facturacion` | Gestión de facturas y comprobantes |
| `auth`        | Autenticación y generación de JWT  |
| `users`       | Gestión de usuarios                |
| `logs`        | Registro de eventos y operaciones  |

---

# 🗄️ Bases de datos

El proyecto utiliza diferentes tecnologías de almacenamiento dependiendo de las necesidades de cada componente.

### PostgreSQL

Utilizado principalmente para información **relacional y transaccional**.

Ejemplos:

* Clientes
* Productos
* Ventas
* Facturación
* Movimientos relacionados con el negocio

### MongoDB

Utilizado para información de tipo **documental**, especialmente útil para:

* Logs
* Historial de eventos
* Información que pueda requerir estructuras flexibles

### Redis

Utilizado para operaciones que requieren **alta velocidad de acceso**, como:

* Caché
* Estados temporales
* Información de sesiones
* Comunicación o almacenamiento temporal

---

# 🔐 Seguridad

La aplicación implementa autenticación mediante **JWT (JSON Web Token)**.

El flujo de autenticación es:

```text
Usuario
   │
   ▼
Login
   │
   ▼
Auth Service
   │
   ▼
Validación de credenciales
   │
   ▼
JWT
   │
   ▼
API Gateway
   │
   ▼
Microservicios protegidos
```

Los endpoints protegidos requieren enviar el token mediante:

```http
Authorization: Bearer <token>
```

Esto permite controlar el acceso a los diferentes recursos de la aplicación.

---

# 📚 Documentación de la API

La API cuenta con documentación interactiva basada en **OpenAPI / Swagger**.

Una vez iniciado el API Gateway, la documentación puede accederse desde:

```text
http://localhost:3000/docs
```

Desde allí es posible:

* Consultar los endpoints disponibles.
* Ver métodos HTTP.
* Consultar parámetros.
* Consultar headers.
* Visualizar cuerpos de las solicitudes.
* Ejecutar requests.
* Visualizar respuestas.
* Consultar códigos HTTP.
* Utilizar autenticación mediante JWT.

---

# 🛠️ Tecnologías utilizadas

## Backend

* **Node.js**
* **TypeScript**
* **NestJS**
* **NestJS Microservices**
* **TypeORM**
* **OpenAPI**
* **Swagger**
* **JWT**

## Bases de datos

* **PostgreSQL**
* **MongoDB**
* **Redis**

## Infraestructura

* **Docker**
* **Docker Compose**

## Herramientas de desarrollo

* **Git**
* **GitHub**
* **npm**
* **Visual Studio Code**

---

# 📂 Estructura del proyecto

```text
Pintame/
│
├── backend/
│   │
│   ├── apps/
│   │   ├── api-gateway/
│   │   ├── auth/
│   │   ├── clientes/
│   │   ├── ventas/
│   │   ├── stock/
│   │   ├── caja/
│   │   ├── facturacion/
│   │   ├── users/
│   │   └── logs/
│   │
│   ├── docker-compose.yml
│   ├── .env
│   ├── nest-cli.json
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    └── ...
```

---

# 🔄 Comunicación entre servicios

Los microservicios se comunican utilizando **TCP mediante NestJS Microservices**.

Por ejemplo:

```text
GET /clientes
      │
      ▼
API Gateway
      │
      │ TCP
      ▼
Clientes Microservice
      │
      ▼
ClientesService
      │
      ▼
TypeORM
      │
      ▼
PostgreSQL
```

Actualmente el microservicio de clientes se encuentra configurado en:

```text
localhost:3001
```

mientras que el API Gateway utiliza:

```text
localhost:3000
```

---

# 📦 Instalación

## Requisitos

Antes de ejecutar el proyecto se necesita tener instalado:

* Node.js
* npm
* Docker
* Docker Compose
* Git

---

## 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
```

Ingresar al proyecto:

```bash
cd Pintame/backend
```

---

## 2. Instalar dependencias

```bash
npm install
```

---

## 3. Configurar variables de entorno

Crear un archivo `.env` en la carpeta `backend`.

Ejemplo:

```env
POSTGRES_HOST=localhost
POSTGRES_USER=pintame
POSTGRES_PASSWORD=pintame_dev
POSTGRES_DB=pintame_clientes
POSTGRES_PORT=5432

MONGO_USER=pintame
MONGO_PASSWORD=pintame_dev
MONGO_PORT=27017

REDIS_PORT=6379

API_GATEWAY_PORT=3000
CLIENTES_PORT=3001
VENTAS_PORT=3002
STOCK_PORT=3003
CAJA_PORT=3004
FACTURACION_PORT=3005
AUTH_PORT=3006
USERS_PORT=3007
LOGS_PORT=3008
```

> ⚠️ Las credenciales utilizadas en desarrollo son únicamente de ejemplo. En producción deben utilizarse variables de entorno seguras.

---

# 🐳 Ejecutar bases de datos

Iniciar los contenedores:

```bash
docker compose up -d
```

Esto inicia:

```text
PostgreSQL → 5432
MongoDB    → 27017
Redis      → 6379
```

Para comprobar los contenedores:

```bash
docker ps
```

---

# ▶️ Ejecutar el proyecto

### API Gateway

```bash
npm run start:dev api-gateway
```

### Clientes

```bash
npm run start:clientes
```

Los demás microservicios podrán iniciarse de la misma manera según los scripts definidos en `package.json`.

---

# 🧪 Ejemplo de endpoint

Actualmente el microservicio de clientes cuenta con:

```http
GET /clientes
```

El endpoint es expuesto por el API Gateway y consulta al microservicio de clientes.

Flujo:

```text
GET /clientes
        ↓
API Gateway :3000
        ↓
TCP
        ↓
Clientes :3001
        ↓
TypeORM
        ↓
PostgreSQL
```

Si la base de datos no contiene clientes, la respuesta será:

```json
[]
```

---

# 📈 Estado actual del proyecto

### Backend

* [x] Arquitectura inicial de microservicios
* [x] API Gateway
* [x] Comunicación TCP entre servicios
* [x] PostgreSQL
* [x] TypeORM
* [x] Microservicio de clientes
* [x] Entidad Cliente
* [x] Consulta de clientes
* [x] Swagger / OpenAPI
* [ ] CRUD completo de clientes
* [ ] Autenticación JWT
* [ ] Autorización
* [ ] Microservicio de ventas
* [ ] Microservicio de stock
* [ ] Microservicio de caja
* [ ] Microservicio de facturación
* [ ] Microservicio de usuarios
* [ ] Sistema de logs
* [ ] Integración completa entre microservicios

### Frontend

* [ ] Aplicación web
* [ ] Login
* [ ] Gestión de JWT
* [ ] Documentación interactiva personalizada
* [ ] Ejecución de endpoints desde el portal
* [ ] Gestión de errores
* [ ] Logout

---

# 👨‍💻 Proyecto

**Pintame** es un proyecto desarrollado con fines académicos y profesionales, aplicando conceptos de:

* Arquitectura de microservicios.
* Desarrollo backend.
* APIs REST.
* Comunicación entre servicios.
* Bases de datos relacionales y no relacionales.
* Autenticación y autorización.
* Documentación de APIs.
* Contenedores.
* Buenas prácticas de desarrollo de software.

---

## 📄 Licencia

Este proyecto se encuentra actualmente en desarrollo.

La licencia y condiciones de uso podrán definirse posteriormente.
