# 🎵 Flujo Completo de Generación de Canciones con Suno AI

## 📋 Resumen del Flujo

Este documento describe el flujo completo implementado para la creación de canciones personalizadas con Suno AI, desde que el usuario agrega canciones al carrito hasta que recibe el audio generado.

---

## 🔄 Flujo Paso a Paso

### 1️⃣ Usuario Agrega Canciones al Carrito

**Endpoint:** `POST /cart/addToCart`

**Request:**
```json
{
  "prompt": "Una canción romántica sobre el atardecer en la playa",
  "genres": ["pop", "romántico"],
  "dedicatedTo": "María",
  "price": 30.00
}
```

**Response:**
```json
{
  "success": true,
  "message": "Canción agregada al carrito",
  "cartItem": {
    "id": 1,
    "userId": 123,
    "prompt": "...",
    "genres": ["pop", "romántico"],
    "dedicatedTo": "María",
    "price": 30.00,
    "status": "draft"
  }
}
```

---

### 2️⃣ Usuario Genera Preview de Letras

**Endpoint:** `POST /cart/:id/generate-preview`

**Descripción:** Genera las letras de la canción usando OpenAI GPT-3.5-turbo

**Response:**
```json
{
  "success": true,
  "lyrics": "Verso 1:\nEn el atardecer...\n\nCoro:\n...",
  "cartItem": {
    "id": 1,
    "lyrics": "...",
    "status": "lyrics_ready"
  }
}
```

**⚠️ IMPORTANTE:** Las letras se guardan en el CartItem y serán copiadas al OrderItem después del pago.

---

### 3️⃣ Usuario Hace Checkout

**Endpoint:** `POST /cart/checkout`

**Descripción:** Crea un PaymentIntent de Stripe con el total del carrito

**Response:**
```json
{
  "success": true,
  "clientSecret": "pi_xxxxx_secret_xxxxx",
  "totalAmount": 90.00,
  "cartItems": [...]
}
```

**Metadata del PaymentIntent:**
```javascript
{
  type: 'cart_checkout',
  cartItemIds: '1,2,3',  // IDs separados por comas
  userId: '123'
}
```

---

### 4️⃣ Frontend Completa el Pago con Stripe

El frontend usa Stripe.js para confirmar el pago con el `clientSecret`.

```javascript
// Ejemplo de código frontend
const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: 'Cliente' }
  }
});
```

---

### 5️⃣ Stripe Envía Webhook al Backend

**Endpoint:** `POST /webhook/stripe`

**Event Type:** `payment_intent.succeeded`

**Descripción:** Este endpoint NO requiere autenticación, la seguridad se valida con la firma del webhook.

**Proceso automático:**

1. ✅ Verificar firma del webhook con `STRIPE_WEBHOOK_SECRET`
2. 📦 Obtener `cartItemIds` del metadata del PaymentIntent
3. 🗃️ Recuperar items del cart con sus letras
4. 📝 Crear Order en la base de datos
5. 📄 Crear OrderItems copiando las letras del cart
6. 🧹 Limpiar el carrito del usuario
7. 🎵 Disparar generación de canciones con Suno (en background)

---

### 6️⃣ Generación de Canciones con Suno (Background)

**Proceso automático ejecutado en background:**

```javascript
Para cada OrderItem con lyrics:
  1. Llamar a Suno AI API
     - Endpoint: POST https://api.sunoapi.org/api/v1/generate
     - Body: { prompt: lyrics, style: genre, title: dedicatedTo }

  2. Crear registro Song con:
     - status: 'generating'
     - sunoSongId: ID devuelto por Suno
     - audioUrl: null (todavía no está listo)

  3. Iniciar polling para esperar completitud (máx 5 minutos)
     - Cada 10 segundos: GET https://api.sunoapi.org/api/v1/get?ids={id}
     - Cuando status === 'complete' y audio_url existe:
       - Actualizar Song.audioUrl
       - Actualizar Song.status = 'completed'
```

---

### 7️⃣ Usuario Consulta sus Canciones

**Endpoint:** `GET /orders/getUserOrders`

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": 1,
      "userId": 123,
      "stripePaymentIntentId": "pi_xxxxx",
      "totalAmount": 90.00,
      "status": "completed",
      "createdAt": "2024-01-15T10:30:00Z",
      "items": [
        {
          "id": 1,
          "orderId": 1,
          "dedicatedTo": "María",
          "prompt": "...",
          "genres": ["pop", "romántico"],
          "lyrics": "...",
          "price": 30.00,
          "status": "processing",
          "Song": {
            "id": 1,
            "title": "María",
            "audioUrl": "https://cdn.suno.ai/...",
            "status": "completed",
            "sunoSongId": "..."
          }
        }
      ]
    }
  ]
}
```

---

## 🔧 Configuración Requerida

### Variables de Entorno

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # Obtener del dashboard de Stripe

# Suno AI
SUNO_API_KEY=xxxxx

# OpenAI
OPENAI_API_KEY=sk-xxxxx

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Session
SESSION_SECRET=tu-secreto-seguro
```

### Configurar Webhook en Stripe Dashboard

1. Ir a: https://dashboard.stripe.com/webhooks
2. Crear nuevo endpoint con URL: `https://tu-dominio.com/webhook/stripe`
3. Seleccionar eventos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copiar el "Signing secret" (whsec_xxx) a `STRIPE_WEBHOOK_SECRET`

### Testing Local con Stripe CLI

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks a tu localhost
stripe listen --forward-to localhost:3000/webhook/stripe

# Esto te dará un webhook secret temporal para desarrollo
# Usar ese secret en STRIPE_WEBHOOK_SECRET
```

---

## 📊 Estados de las Entidades

### CartItem.status
- `draft` - Creado, sin letras
- `lyrics_ready` - Letras generadas con OpenAI

### Order.status
- `completed` - Pago exitoso
- `refunded` - Pago reembolsado
- `failed` - Pago fallido

### OrderItem.status
- `processing` - En proceso de generación
- `completed` - Generación completa
- `delivered` - Entregado al usuario

### Song.status
- `generating` - Suno AI generando
- `completed` - Audio disponible
- `failed` - Error en generación

---

## 🔍 Debugging

### Ver logs del webhook

```bash
# Todos los logs del webhook
grep "Webhook recibido" logs.txt

# Ver proceso de creación de orden
grep "Creando orden" logs.txt

# Ver generación de Suno
grep "Generando canción" logs.txt
```

### Problemas comunes

#### ❌ Error: "No webhook signature"
**Causa:** Falta `STRIPE_WEBHOOK_SECRET` en .env
**Solución:** Configurar el webhook secret de Stripe

#### ❌ Error: "No se encontraron items del cart"
**Causa:** Los items del cart ya fueron limpiados o no existen
**Solución:** Verificar que el webhook se procese solo una vez

#### ❌ Error: "NINGÚN ITEM TIENE LETRAS"
**Causa:** No se generaron letras antes del checkout
**Solución:** Llamar a `/cart/:id/generate-preview` antes de checkout

#### ❌ Error: "Timeout esperando generación"
**Causa:** Suno tardó más de 5 minutos
**Solución:** Revisar status de Suno API o aumentar timeout

---

## 🎯 Endpoints Críticos

| Endpoint | Auth | Descripción |
|----------|------|-------------|
| `POST /cart/addToCart` | ✅ | Agregar canción al carrito |
| `POST /cart/:id/generate-preview` | ✅ | Generar letras con OpenAI |
| `POST /cart/checkout` | ✅ | Crear PaymentIntent |
| `POST /webhook/stripe` | ❌ | Recibir eventos de Stripe |
| `GET /orders/getUserOrders` | ✅ | Obtener canciones del usuario |

---

## 🚀 Mejoras Futuras (Recomendadas)

1. **Notificaciones en tiempo real**
   - WebSockets o Server-Sent Events
   - Notificar al usuario cuando la canción esté lista

2. **Cola de procesamiento**
   - Usar Bull/BullMQ para manejar generación de Suno
   - Mejor manejo de reintentos

3. **Webhooks de Suno**
   - Si Suno ofrece webhooks, usar en vez de polling

4. **Almacenamiento de audio**
   - Descargar y almacenar en S3/CloudFlare R2
   - No depender de URLs de Suno

5. **Administración**
   - Dashboard para ver estado de generaciones
   - Reintentar generaciones fallidas

---

## ✅ Checklist de Producción

- [ ] `STRIPE_WEBHOOK_SECRET` configurado
- [ ] Webhook registrado en Stripe Dashboard
- [ ] `sequelize.sync({ force: false })` para NO borrar datos
- [ ] Variables de entorno en servidor de producción
- [ ] HTTPS habilitado (requerido para webhooks de Stripe)
- [ ] Logs de errores configurados (Sentry, LogRocket, etc)
- [ ] Backup de base de datos configurado
- [ ] Rate limiting en endpoints públicos

---

## 📞 Soporte

Si encuentras problemas, revisa:
1. Logs del servidor
2. Dashboard de Stripe (ver eventos recibidos)
3. Estado de Suno API
4. Base de datos (verificar que las letras se guardaron)

---

**Última actualización:** 2024-01-15
