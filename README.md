# Friendly Zapata

Aplicación web de encuentros con registro en Firebase y flujo de verificación mediante notificaciones.

## Archivos
- `index.html`: Interfaz principal y estructura de la aplicación.
- `styles.css`: Estilos básicos para el sitio.
- `app.js`: Lógica de registro, login, perfiles, chats y sincronización con Firebase.

## Cómo usar
1. Abre `index.html` en un servidor local.
2. Rellena los permisos y crea una cuenta.
3. Completa el registro y la verificación con el código enviado en notificación.

## Firebase
Se usa Firestore y Storage con la configuración proporcionada por la app.

## OneSignal
Debes reemplazar `YOUR_ONESIGNAL_APP_ID` en `app.js` con tu App ID de OneSignal y completar la integración de notificaciones reales.

## Notas
- La aplicación almacena datos en Firestore.
- Actualmente las notificaciones se simulan con `Notification` de navegador.
- Ajusta las reglas de Firestore y la integración de OneSignal antes de publicar.
