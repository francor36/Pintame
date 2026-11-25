# Pintame Mobile

Aplicación móvil React Native para Expo Go en Android y iPhone. Se conecta al API Gateway del backend.

## Arranque

1. Arrancá los servicios del backend y el API Gateway en la computadora.
2. Conectá el teléfono a la misma red Wi-Fi que la computadora.
3. Desde esta carpeta ejecutá `npm start` y escaneá el QR con Expo Go.
4. En la pantalla de acceso, reemplazá `localhost` por la IP local de la computadora, por ejemplo `http://192.168.1.25:3010`.
5. Ingresá con tu usuario y contraseña del sistema.

En la computadora podés consultar la IP local con `ipconfig` y buscar la dirección IPv4 del adaptador Wi-Fi. Si el teléfono no puede conectar, revisá que Windows Firewall permita el puerto 3010 y que el backend escuche en la red local.

La sesión se guarda con Expo SecureStore. El token no se incluye en el código ni se guarda en texto plano. La aplicación muestra Inicio, Stock, Ventas, Caja, Clientes y comprobantes B internos. Las ventas se crean despendientes y se confirman desde Ventas; la emisión de comprobante sigue siendo interna y no se conecta con ARCA.

## API local

La dirección inicial es `http://localhost:3010`, útil para simuladores locales. Para un teléfono físico, usá la IP local de la computadora en la pantalla de acceso.
