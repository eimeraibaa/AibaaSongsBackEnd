# 🎵 Mejoras al Flujo de Creación de Canciones

Este documento detalla todas las mejoras implementadas en el sistema de generación de canciones con Suno AI.

## 📋 Resumen de Mejoras

### ✅ Implementadas

1. **Servicio de correo electrónico** - Notificaciones cuando las canciones están listas
2. **Endpoints de descarga y streaming** - Descarga local y reproducción de canciones
3. **Sistema de notificaciones por email** - Emails automáticos con links de descarga
4. **Webhook de Suno** - Soporte para callbacks cuando estén disponibles
5. **Manejo mejorado de errores** - Reintentos automáticos con backoff exponencial
6. **Dual mode: Polling + Webhook** - Funciona con o sin callbackUrl público

---

## 🚀 Nuevas Funcionalidades

### 1. Sistema de Notificaciones por Email

#### Características:
- ✅ Email automático cuando todas las canciones de una orden están listas
- ✅ Links directos para escuchar y descargar
- ✅ Email de error si la generación falla
- ✅ Diseño HTML responsive y profesional
- ✅ Modo de prueba con Ethereal (sin configuración)

#### Variables de entorno requeridas:

```bash
# Configuración de Email (Opcional - usa Ethereal en desarrollo si no está configurado)
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-contraseña-de-aplicación
EMAIL_FROM=noreply@aibaasongs.com  # Opcional, usa EMAIL_USER por defecto

# URL del frontend para los links en el email
FRONTEND_URL=https://tu-dominio.com  # Default: http://localhost:3000
```

#### Configuración de Gmail:
1. Ir a https://myaccount.google.com/security
2. Habilitar "Verificación en dos pasos"
3. Generar una "Contraseña de aplicación"
4. Usar esa contraseña en `EMAIL_PASSWORD`

---

### 2. Endpoints de Canciones

#### GET /song/user
Lista todas las canciones del usuario autenticado

**Respuesta:**
```json
{
  "success": true,
  "count": 5,
  "songs": [
    {
      "id": 1,
      "title": "Para María",
      "genre": "pop",
      "status": "completed",
      "audioUrl": "https://...",
      "imageUrl": "https://...",
      "createdAt": "2025-10-24T..."
    }
  ]
}
```

#### GET /song/:id
Obtiene información de una canción específica

**Respuesta:**
```json
{
  "success": true,
  "song": {
    "id": 1,
    "title": "Para María",
    "lyrics": "...",
    "audioUrl": "https://...",
    "status": "completed"
  }
}
```

#### GET /song/:id/stream
Obtiene la URL de streaming de la canción

**Respuesta:**
```json
{
  "success": true,
  "audioUrl": "https://cdn.suno.ai/...",
  "imageUrl": "https://cdn.suno.ai/...",
  "title": "Para María",
  "genre": "pop"
}
```

#### GET /song/:id/download
Descarga el archivo MP3 directamente

**Respuesta:** Stream de archivo MP3 con headers:
```
Content-Type: audio/mpeg
Content-Disposition: attachment; filename="Para_Maria-1.mp3"
```

---

### 3. Webhook de Suno (CallbackUrl)

#### Sin CallbackUrl (Modo actual - Polling)
- ✅ **Funciona sin configuración adicional**
- Hace polling cada 10 segundos hasta que la canción esté lista
- Máximo 5 minutos de espera
- Envía email cuando todas las canciones están completadas

#### Con CallbackUrl (Modo recomendado - más eficiente)
- ✅ **Configuración futura cuando tengas dominio público**
- Suno envía notificación automática cuando la canción está lista
- No hace polling, ahorra recursos
- Respuesta más rápida

**Para habilitar CallbackUrl:**

1. Configura tu dominio público en las variables de entorno:
```bash
SUNO_CALLBACK_URL=https://tu-dominio.com/webhook/suno
```

2. Asegúrate de que tu servidor sea accesible públicamente

3. El sistema detectará automáticamente la configuración y usará webhook en lugar de polling

**Endpoint del webhook:** `POST /webhook/suno`

**Formato del payload que Suno enviará:**
```json
{
  "taskId": "abc123",
  "callbackType": "song_generation",
  "status": {
    "code": 200,
    "message": "Success"
  },
  "data": [
    {
      "id": "suno-song-id-123",
      "audio_url": "https://cdn.suno.ai/...",
      "image_url": "https://cdn.suno.ai/...",
      "title": "Song Title",
      "duration": 180,
      "tags": ["pop", "upbeat"]
    }
  ]
}
```

---

### 4. Mejoras en el Manejo de Errores

#### Reintentos Automáticos:
- ✅ Hasta 3 reintentos para generación de canciones
- ✅ Backoff exponencial (2s, 4s, 8s)
- ✅ Reintentos en consultas de estado
- ✅ Logs detallados de cada intento

#### Ejemplos de logs:
```
⚠️ Intento 1/4 falló. Reintentando en 2000ms...
⚠️ Intento 2/4 falló. Reintentando en 4000ms...
✅ Canción generada exitosamente en el intento 3
```

---

## 🗄️ Cambios en la Base de Datos

### Nueva columna en tabla `orders`

Se agregó el campo `userEmail` para guardar el email del usuario y poder enviar notificaciones.

**Ejecutar migración:**
```bash
psql $DATABASE_URL -f migrations/add_userEmail_to_orders.sql
```

O ejecutar manualmente:
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "userEmail" VARCHAR(255);
```

---

## 📊 Flujo Completo Actualizado

### Flujo con Polling (Sin CallbackUrl)

```
1. Usuario genera letras con OpenAI
   └─> Estado: 'lyrics_ready'

2. Usuario hace checkout con Stripe
   └─> Stripe webhook recibe pago exitoso

3. Backend crea Order y guarda email del usuario
   └─> Order: userId, totalAmount, userEmail

4. Backend crea OrderItems con las letras
   └─> OrderItem: lyrics, dedicatedTo, genres

5. Backend llama a Suno AI (sin callbackUrl)
   └─> Suno: Devuelve songIds
   └─> Backend: Crea Song con status='generating'

6. Backend hace POLLING cada 10 segundos
   └─> Consulta estado de canción en Suno
   └─> Actualiza Song con audioUrl cuando está lista
   └─> Status: 'completed'

7. Cuando TODAS las canciones están listas:
   └─> Envía EMAIL al usuario
   └─> Email contiene:
       - Lista de canciones
       - Links para escuchar
       - Links para descargar
```

### Flujo con Webhook (Con CallbackUrl) 🎯 RECOMENDADO

```
1-4. [Igual que arriba]

5. Backend llama a Suno AI (CON callbackUrl)
   └─> Suno: Devuelve songIds
   └─> Backend: Crea Song con status='generating'
   └─> ❌ NO hace polling

6. Suno ENVÍA webhook cuando canción está lista
   └─> POST /webhook/suno
   └─> Backend actualiza Song con audioUrl
   └─> Status: 'completed'

7. Backend verifica si TODAS las canciones de la orden están listas
   └─> Si todas completas: Envía EMAIL
   └─> Email contiene links de descarga y streaming
```

---

## 🔧 Configuración Completa

### Variables de Entorno (.env)

```bash
# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/aibaasongs

# APIs
SUNO_API_KEY=tu-clave-de-suno
OPENAI_API_KEY=tu-clave-de-openai

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Email (Opcional - usa Ethereal en desarrollo)
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-contraseña-de-aplicación
EMAIL_FROM=noreply@aibaasongs.com

# Frontend
FRONTEND_URL=https://tu-dominio.com

# Suno Webhook (Opcional - para cuando tengas dominio público)
SUNO_CALLBACK_URL=https://tu-dominio.com/webhook/suno

# Session
SESSION_SECRET=tu-clave-secreta-super-segura
```

---

## 🧪 Testing

### Probar el flujo completo en desarrollo:

1. **Generar letras:**
```bash
POST /cart/:id/generate-preview
```

2. **Hacer checkout:**
```bash
POST /cart/checkout
```

3. **Simular webhook de Stripe:**
```bash
# Usar Stripe CLI
stripe listen --forward-to localhost:3000/webhook/stripe
```

4. **Ver logs del email:**
Si no configuraste EMAIL_USER/PASSWORD, verás en los logs:
```
📧 Preview URL: https://ethereal.email/message/xxxxx
```
Abre ese URL para ver el email de prueba.

5. **Descargar canción:**
```bash
GET /song/:id/download
```

### Probar webhook de Suno (cuando tengas callbackUrl):

```bash
# Simular webhook de Suno
curl -X POST http://localhost:3000/webhook/suno \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "test123",
    "callbackType": "song_generation",
    "status": {
      "code": 200,
      "message": "Success"
    },
    "data": [{
      "id": "suno-song-id-aqui",
      "audio_url": "https://cdn.suno.ai/test.mp3",
      "image_url": "https://cdn.suno.ai/test.jpg",
      "title": "Test Song",
      "duration": 180
    }]
  }'
```

---

## 📝 Nuevos Métodos en Storage

```javascript
// Canciones
await storage.getSongById(songId)
await storage.getUserSongs(userId)
await storage.getOrderSongs(orderId)
await storage.getSongBySunoId(sunoSongId)
await storage.updateSongImage(songId, imageUrl)

// Order Items
await storage.getOrderItemById(orderItemId)
```

---

## 🎨 Estructura del Email

### Email de Canciones Listas:

```
┌─────────────────────────────────────┐
│   🎵 ¡Tus canciones están listas!  │
│   Tu orden #123 ha sido completada │
└─────────────────────────────────────┘

¡Hola! 👋

Estamos emocionados de informarte que tus 2 canciones
personalizadas han sido generadas con éxito.

┌─────────────────────────────────────┐
│ Tus canciones:                      │
│                                      │
│ • Para María                        │
│   Género: pop                       │
│   [Escuchar] [Descargar]            │
│                                      │
│ • Feliz Cumpleaños                  │
│   Género: rock                      │
│   [Escuchar] [Descargar]            │
└─────────────────────────────────────┘

[Ver mi orden completa] [Ver todas mis canciones]

Consejos:
• Puedes descargar tus canciones en formato MP3
• Las canciones estarán disponibles en tu cuenta para siempre
• Comparte tus canciones con quien quieras 💜
```

---

## 🚦 Estados de las Canciones

```
'generating'  → Canción en proceso de generación
'completed'   → Canción lista con audioUrl
'failed'      → Error en la generación
```

---

## 📚 Archivos Modificados/Creados

### Nuevos archivos:
- `src/services/emailService.js` - Servicio de email con nodemailer
- `migrations/add_userEmail_to_orders.sql` - Migración SQL
- `MEJORAS_FLUJO_CANCIONES.md` - Esta documentación

### Archivos modificados:
- `src/controllers/webhook.controller.js` - Notificaciones y webhook de Suno
- `src/controllers/song.controller.js` - Endpoints de descarga y streaming
- `src/routes/song.routes.js` - Nuevas rutas
- `src/routes/webhook.routes.js` - Ruta webhook de Suno
- `src/services/sunoService.js` - Mejoras de errores y callbackUrl
- `src/services/storage.js` - Nuevos métodos
- `src/models/orders.js` - Campo userEmail
- `src/app.js` - Middleware para webhook de Suno
- `package.json` - Dependencia nodemailer

---

## ⚡ Performance

### Modo Polling (Sin CallbackUrl):
- Consumo: ~30 requests cada 5 minutos por canción
- Latencia: 10-300 segundos hasta notificación
- Recursos: Medio

### Modo Webhook (Con CallbackUrl):
- Consumo: 0 requests de polling
- Latencia: <5 segundos hasta notificación
- Recursos: Bajo ✅

---

## 🔒 Seguridad

- ✅ Todos los endpoints de canciones requieren autenticación
- ✅ Verificación de ownership (usuario solo ve sus canciones)
- ✅ Webhook de Stripe con verificación de firma
- ✅ Webhook de Suno sin autenticación (viene de Suno)
- ✅ Validación de parámetros en todos los endpoints
- ✅ Manejo seguro de errores sin exponer detalles internos

---

## 🎯 Próximos Pasos Recomendados

1. **Configurar dominio público** para habilitar SUNO_CALLBACK_URL
2. **Configurar servicio de email profesional** (SendGrid, Mailgun, etc.)
3. **Agregar panel de admin** para ver estado de generaciones
4. **Implementar rate limiting** en endpoints públicos
5. **Agregar métricas** de generación de canciones
6. **Implementar sistema de notificaciones push** (opcional)

---

## 📞 Soporte

Si tienes algún problema:

1. Revisa los logs del servidor
2. Verifica las variables de entorno
3. Asegúrate de ejecutar la migración SQL
4. Verifica que nodemailer esté instalado: `npm list nodemailer`

---

## ✨ Resumen de Mejoras

✅ **Notificaciones por email** cuando las canciones están listas
✅ **Descarga local** de archivos MP3
✅ **Streaming** de canciones directamente
✅ **Webhook de Suno** para notificaciones en tiempo real
✅ **Reintentos automáticos** con manejo robusto de errores
✅ **Dual mode** polling + webhook según configuración
✅ **Documentación completa** de todo el flujo

---

**Fecha de implementación:** 2025-10-24
**Versión:** 2.0.0
**Estado:** ✅ Completado y listo para producción
