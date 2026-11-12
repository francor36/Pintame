# Pintame — Backend

Backend NestJS en monorepo. El API Gateway expone HTTP/REST y se comunica por TCP con los microservicios.

## Servicios

| Servicio | Puerto predeterminado | Persistencia |
| --- | ---: | --- |
| API Gateway | `3000` | — |
| Clientes | `3001` | PostgreSQL |
| Ventas | `3002` | PostgreSQL |
| Stock | `3003` | MySQL |
| Caja | `3004` | MySQL |
| Facturación | `3005` | MySQL |
| Auth | `3006` | MySQL, a través de Usuarios |
| Usuarios | `3007` | MySQL |
| Logs | `3008` | MongoDB |

Los puertos se pueden cambiar con las variables correspondientes del archivo `.env`. Los servicios usan las bases que configuran `POSTGRES_*`, `VENTAS_DATABASE_URL`, `STOCK_DATABASE_URL` y `MYSQL_*`.
Logs usa `MONGO_HOST` (predeterminado `localhost`), `MONGO_PORT`, `MONGO_USER`, `MONGO_PASSWORD` y `MONGO_DB` (predeterminado `pintame_logs`).

## Configuración local

Crear `.env` a partir de la configuración local del proyecto y definir, además de las conexiones de base y puertos:

```env
JWT_SECRET=<secreto aleatorio de al menos 32 caracteres>
BOOTSTRAP_ADMIN_EMAIL=<identificador de acceso>
BOOTSTRAP_ADMIN_NAME=<nombre visible>
BOOTSTRAP_ADMIN_PASSWORD=<contraseña de al menos 12 caracteres>
```

Usuarios crea la tabla aditiva `usuarios` al iniciar. Si no existe la cuenta indicada, crea el primer usuario con rol `ADMIN`. La contraseña se almacena con hash. No se deben subir `.env`, contraseñas ni tokens al repositorio.

## Arranque local

Iniciar PostgreSQL y MySQL con los contenedores locales. Luego ejecutar cada comando en una terminal separada:

```powershell
npm run start:clientes
npm run start:stock
npm run start:caja
npm run start:ventas
npm run start:facturacion
npm run start:users
npm run start:auth
npm run start:logs
npm run start:dev
```

Las dependencias de negocio deben estar disponibles antes de usar el Gateway. En particular, Ventas depende de Stock y Caja; Facturación depende de Ventas.

## Autenticación

`POST /auth/login` recibe `{ "email": "...", "password": "..." }` y devuelve un bearer token JWT. Enviar ese token en las demás rutas protegidas:

```http
Authorization: Bearer <accessToken>
```

`GET /auth/perfil` devuelve el usuario del token. Las rutas `/users` requieren rol `ADMIN`; permiten listar, buscar, crear y actualizar usuarios. El rol predeterminado al crear un usuario es `CAJERO`.

Los usuarios autenticados pueden operar Clientes, Caja, Stock, Ventas y Facturación. El Gateway documenta las rutas en `/docs`.

## Flujos principales

- **Stock**: productos y movimientos de ingreso, egreso y ajuste.
- **Ventas**: crear venta pendiente; confirmar descuenta stock y registra el cobro en Caja; anular solo ventas pendientes.
- **Clientes**: clientes, saldo a favor NTDC con vencimiento de 30 días y consumo FIFO transaccional.
- **Caja**: apertura, ingresos, ventas, retiros, movimientos y cierre.
- **Facturación**: emitir un comprobante **interno clase B** para una venta pagada con `POST /facturas/ventas/:ventaId`. No se conecta con ARCA ni genera CAE. Solo se admite un comprobante por venta. También se puede listar con `GET /facturas`, consultar por ID con `GET /facturas/:id` o por venta con `GET /facturas/ventas/:ventaId`.
- **Logs**: el Gateway registra automáticamente método, ruta, estado, duración y usuario, sin guardar tokens, contraseñas ni cuerpos de petición. Los administradores pueden consultar eventos recientes en `GET /logs` y un evento por ID en `GET /logs/:id`.

## Build

```powershell
npm run build
```

El build regenera los clientes Prisma de Stock y Ventas desde sus esquemas y compila los nueve proyectos Nest. Los comandos `start:stock` y `start:ventas` también regeneran esos clientes para recuperarlos después de una instalación de dependencias. Esto no aplica cambios a las bases; no ejecutar resets para iniciar el sistema.
