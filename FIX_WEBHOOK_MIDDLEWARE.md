# Solución: Error de Firma del Webhook de Stripe

## El Error Original

```
StripeSignatureVerificationError: Webhook payload must be provided as a string
or a Buffer instance representing the _raw_ request body.
Payload was provided as a parsed JavaScript object instead.
```

## ¿Qué Causaba el Error?

Stripe necesita el **body RAW (Buffer)** del request para verificar la firma del webhook. Si el body es parseado a JSON antes de llegar al controlador, la verificación falla.

### Orden Incorrecto de Middlewares (ANTES)

```javascript
app.use(express.json());              // ❌ Parseaba TODO a JSON primero
app.use(express.urlencoded());

app.use('/webhook/stripe', express.raw({ type: 'application/json' }));
app.use('/webhook', webhookRoutes);   // ❌ Ya era muy tarde, body ya parseado
```

**Problema:** Cuando `express.json()` se ejecuta primero, convierte el body de TODOS los requests a JavaScript objects, incluyendo `/webhook/stripe`. El middleware `express.raw()` nunca se ejecuta porque el body ya fue parseado.

### Orden Correcto de Middlewares (AHORA)

```javascript
// 1. CORS y handlers básicos
app.use(cors(...));

// 2. Raw body SOLO para /webhook/stripe
app.use('/webhook/stripe', express.raw({ type: 'application/json' }));

// 3. Rutas de webhook (reciben raw body)
app.use('/webhook', webhookRoutes);

// 4. DESPUÉS parsear JSON para el resto
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

// 5. Resto de rutas (reciben JSON parseado)
app.use('/users', usersRoutes);
app.use('/cart', cartRoutes);
// etc...
```

**Solución:** Al aplicar los webhooks ANTES de `express.json()`, el endpoint `/webhook/stripe` recibe el raw Buffer mientras que el resto de las rutas reciben JSON parseado normalmente.

---

## Cómo Funciona Ahora

### Request a `/webhook/stripe`

1. **CORS:** ✅ Pasa
2. **express.raw():** ✅ Convierte body a Buffer
3. **webhookRoutes:** ✅ Recibe raw Buffer
4. **express.json():** ❌ No se ejecuta (ya se respondió)

**Resultado:** El webhook puede verificar la firma ✅

### Request a `/cart/checkout`

1. **CORS:** ✅ Pasa
2. **express.raw():** ❌ No coincide la ruta, se salta
3. **webhookRoutes:** ❌ No coincide la ruta, se salta
4. **express.json():** ✅ Parsea a JSON
5. **cartRoutes:** ✅ Recibe JSON object

**Resultado:** Las rutas normales funcionan igual ✅

---

## Verificación del Fix

Después del despliegue en Railway, los logs deben mostrar:

### ❌ ANTES (Error)
```
❌ Error procesando webhook: StripeSignatureVerificationError
```

### ✅ DESPUÉS (Correcto)
```
📨 Webhook recibido: checkout.session.completed
✅ Checkout Session completado: cs_xxxxx
💳 Payment Intent: pi_xxxxx
💰 Monto pagado: 29.99 USD
📦 Obteniendo items del cart: [1, 2]
📝 Creando orden...
✅ Orden creada: 123
🎵 Iniciando generación de canciones con Suno...
```

---

## Pasos Siguientes

### 1. Esperar Despliegue en Railway

- Ve a **Railway Dashboard** → tu proyecto → **Deployments**
- Espera a que el despliegue se complete (~1-2 minutos)
- Status debe mostrar "Active"

### 2. Probar con un Pago de Prueba

1. Ir a tu frontend
2. Agregar una canción al carrito
3. Generar letras (`POST /cart/:id/generate-preview`)
4. Hacer checkout
5. Pagar con tarjeta de prueba: `4242 4242 4242 4242`
   - Fecha: Cualquier fecha futura
   - CVC: Cualquier 3 dígitos (ej: 123)

### 3. Verificar en los Logs

Railway Dashboard → Deployments → Logs

Buscar:
```
📨 Webhook recibido: checkout.session.completed
```

Si ves ese mensaje, **el webhook está funcionando** ✅

### 4. Verificar en Stripe Dashboard

https://dashboard.stripe.com/test/webhooks

- Click en tu webhook
- Ve a la pestaña "Events"
- Busca el último evento `checkout.session.completed`
- Status debe ser "Succeeded" (verde)

---

## Troubleshooting

### Si sigue sin funcionar:

**1. Verificar variables de entorno en Railway:**

```
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  ← CRÍTICO
SUNO_API_KEY=xxxxx
OPENAI_API_KEY=sk-xxxxx
```

**2. Verificar que el webhook esté configurado correctamente:**

- URL: `https://aibaasongsbackend-production.up.railway.app/webhook/stripe`
- Eventos: `checkout.session.completed` ✅

**3. Ver logs completos en Railway:**

```bash
# En Railway Dashboard
Deployments → Click en el deployment activo → Logs
```

**4. Test manual del webhook:**

En Stripe Dashboard:
- Webhooks → tu endpoint → "Send test webhook"
- Evento: `checkout.session.completed`

Deberías ver en los logs de Railway que el webhook fue recibido.

---

## Resumen de Cambios

**Archivo modificado:** `src/app.js`

**Commits:**
- `7833aee` - Fix Stripe webhook middleware order to receive raw body
- `346d98f` - Add webhook route clarification document
- `ee3305e` - Add webhook diagnosis tools and documentation

**Branch:** `claude/fix-song-generation-017L5SZg5w77U2TA9BkrjAST`

---

## Flujo Completo (Ahora Funciona)

```
1. Usuario hace checkout
   ↓
2. Frontend llama: POST /cart/checkout
   ↓
3. Backend crea Stripe Checkout Session
   ↓
4. Usuario paga en Stripe
   ↓
5. Stripe envía webhook: POST /webhook/stripe
   ↓
6. Backend recibe raw body ← FIX APLICADO AQUÍ
   ↓
7. Backend verifica firma ✅
   ↓
8. Backend procesa el evento checkout.session.completed
   ↓
9. Backend crea orden (Order)
   ↓
10. Backend crea order items (OrderItems)
   ↓
11. Backend limpia el carrito
   ↓
12. Backend llama a Suno API para generar canciones
   ↓
13. Suno genera las canciones (~60 segundos)
   ↓
14. Suno envía webhook o polling detecta completitud
   ↓
15. Backend actualiza las canciones con URLs
   ↓
16. Backend envía email al usuario ✅
```

---

## Notas Importantes

- **No tocar el orden de los middlewares** en `src/app.js`
- El webhook de Stripe SIEMPRE debe estar antes de `express.json()`
- El webhook de Suno puede usar JSON normal (ya está configurado)
- En desarrollo local, usar ngrok para exponer el webhook
- En producción (Railway), la URL pública funciona directamente
