# Configuración del Webhook de Stripe

## El Problema

El sistema **no está generando canciones después del pago** porque el webhook de Stripe no está configurado correctamente. Sin el webhook, el backend nunca se entera de que el pago se completó.

## Flujo Actual vs Flujo Esperado

### ❌ Flujo Actual (Roto)
```
Usuario paga → Stripe procesa pago → [SILENCIO] → Backend no hace nada
```

### ✅ Flujo Esperado (Correcto)
```
Usuario paga → Stripe procesa pago → Webhook notifica backend → Backend genera canciones
```

---

## Solución: Configurar Webhook de Stripe

### Paso 1: Exponer tu servidor local con ngrok

Si estás en desarrollo local, Stripe no puede alcanzar `localhost`. Usa ngrok:

```bash
# Instalar ngrok (si no lo tienes)
npm install -g ngrok

# Ejecutar ngrok en el puerto de tu servidor (3000 por defecto)
ngrok http 3000
```

Ngrok te dará una URL pública como: `https://abc123.ngrok-free.app`

### Paso 2: Configurar el webhook en Stripe Dashboard

1. Ve a: https://dashboard.stripe.com/test/webhooks
2. Click en "Add endpoint" (Agregar endpoint)
3. Configura:
   - **Endpoint URL**: `https://tu-url-ngrok.ngrok-free.app/webhook/stripe`
     - Ejemplo: `https://abc123.ngrok-free.app/webhook/stripe`
   - **Events to send**: Selecciona estos eventos:
     - `checkout.session.completed` ✅ (CRÍTICO)
     - `payment_intent.succeeded` (opcional)
     - `payment_intent.payment_failed` (opcional)

4. Click en "Add endpoint"

### Paso 3: Copiar el Webhook Secret

1. En la página del webhook que acabas de crear
2. Click en "Reveal" en la sección "Signing secret"
3. Copia el secret (empieza con `whsec_...`)

### Paso 4: Configurar tu `.env`

Agrega o actualiza en tu archivo `.env`:

```env
# Stripe Webhook Secret (copiado del dashboard)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Paso 5: Reiniciar el servidor

```bash
# Detener el servidor (Ctrl+C)
# Iniciar de nuevo
npm start
# o
npm run dev
```

---

## Verificación

### 1. Verificar que el webhook está registrado

Ejecuta en tu navegador:
```
GET http://localhost:3000/webhook/suno-config
```

Esto te mostrará un diagnóstico completo.

### 2. Probar con un pago real

1. Crea un cart item con letras generadas
2. Procede al checkout
3. Usa la tarjeta de prueba de Stripe: `4242 4242 4242 4242`
   - Cualquier fecha futura
   - Cualquier CVC (ej: 123)
4. Completa el pago

### 3. Revisar los logs del servidor

Deberías ver estos mensajes en orden:

```
📨 Webhook recibido: checkout.session.completed
✅ Checkout Session completado: cs_test_xxx
📦 Obteniendo items del cart: [1, 2, 3]
📝 Creando orden...
✅ Orden creada: 123
📝 Creando order items...
✅ Order items creados: 3
🧹 Limpiando cart del usuario...
🎵 Iniciando generación de canciones con Suno...
✅ Proceso de checkout session completado exitosamente
🎵 Generando canciones para orden: 123
```

Si NO ves `📨 Webhook recibido`, el webhook no está llegando.

---

## Solución para Producción

En producción (servidor público), solo necesitas:

1. Configurar el webhook en Stripe Dashboard con tu URL de producción:
   ```
   https://tu-dominio.com/webhook/stripe
   ```

2. Copiar el webhook secret a tu `.env` de producción

3. Asegurarte de que el puerto 443 (HTTPS) o 80 (HTTP) esté abierto

---

## Troubleshooting

### El webhook no llega

**Verificar:**
- ✅ ngrok está corriendo y la URL es válida
- ✅ El webhook está configurado en Stripe Dashboard
- ✅ La URL del webhook termina en `/webhook/stripe`
- ✅ Los eventos `checkout.session.completed` están seleccionados

**Probar manualmente:**
Ve a Stripe Dashboard → Webhooks → tu endpoint → "Send test webhook"

### Las canciones no se generan

**Verificar:**
1. Los cart items tienen letras (`lyrics` no es NULL)
   - Antes del checkout, llama a `POST /cart/:id/generate-preview`
2. Las variables de entorno están configuradas:
   - `SUNO_API_KEY`
   - `OPENAI_API_KEY` (para generar letras)

### Errores comunes

```bash
# Error: "No signature found in header"
# → El STRIPE_WEBHOOK_SECRET está mal configurado o vacío

# Error: "No cart items found"
# → El carrito se limpió antes del webhook, verifica que metadata.cartItemIds exista

# Error: "No items with lyrics"
# → Las letras no se generaron antes del checkout
```

---

## Alternativa: Usar Stripe CLI para desarrollo

Si no quieres usar ngrok, puedes usar Stripe CLI:

```bash
# Instalar Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Escuchar webhooks y reenviarlos a localhost
stripe listen --forward-to localhost:3000/webhook/stripe

# Esto te dará un webhook secret temporal
# Cópialo a tu .env
```

---

## Diagrama del Flujo Completo

```
┌─────────────────┐
│   Usuario paga  │
│   en Stripe     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Stripe procesa el pago         │
│  (checkout.session.completed)   │
└────────┬────────────────────────┘
         │
         ▼  HTTP POST (webhook)
┌─────────────────────────────────┐
│  Backend: /webhook/stripe       │
│  handleCheckoutSessionCompleted │
└────────┬────────────────────────┘
         │
         ├─► 1. Obtiene cart items
         ├─► 2. Crea orden (Order)
         ├─► 3. Crea order items (OrderItems)
         ├─► 4. Limpia carrito
         └─► 5. Genera canciones (generateSongsForOrder)
                │
                ▼
         ┌──────────────────────┐
         │  Suno API            │
         │  genera canciones    │
         └──────────────────────┘
```

---

## Contacto

Si sigues teniendo problemas después de seguir estos pasos, verifica:

1. Los logs completos del servidor
2. Los logs de Stripe Dashboard → Webhooks → tu endpoint → "Recent events"
3. Que las variables de entorno estén cargadas correctamente
