## RUTA CORRECTA DEL WEBHOOK DE STRIPE

### ❌ INCORRECTO
```
https://aibaasongsbackend-production.up.railway.app/api/webhooks/stripe
                                                      ^^^  ^^^^^^^^
                                                      |      |
                                                      |      └─ Plural (incorrecto)
                                                      └─ No existe prefijo /api
```

### ✅ CORRECTO
```
https://aibaasongsbackend-production.up.railway.app/webhook/stripe
```

---

## Cómo se construye la ruta

**src/app.js (línea 46):**
```javascript
app.use('/webhook', webhookRoutes);
```

**src/routes/webhook.routes.js (línea 18):**
```javascript
router.post('/stripe', handleStripeWebhook);
```

**Ruta final:** `/webhook` + `/stripe` = **`/webhook/stripe`**

---

## Configuración en Stripe Dashboard

1. **URL del webhook:**
   ```
   https://aibaasongsbackend-production.up.railway.app/webhook/stripe
   ```

2. **Eventos a escuchar:**
   - ✅ `checkout.session.completed` (CRÍTICO - dispara la generación)
   - ✅ `payment_intent.succeeded` (opcional)
   - ✅ `payment_intent.payment_failed` (opcional)

3. **Webhook Secret:**
   - Copiar de Stripe Dashboard
   - Agregar a Railway como variable: `STRIPE_WEBHOOK_SECRET`

---

## Otras rutas disponibles

Tu aplicación tiene estas rutas de webhook:

```
POST /webhook/stripe              → Recibe eventos de Stripe
POST /webhook/suno                → Recibe notificaciones de Suno
GET  /webhook/suno-config         → Diagnóstico de configuración
POST /webhook/update-order-email/:orderId  → Actualizar email de orden
POST /webhook/test-email/:orderId → Enviar email de prueba
```

---

## Verificación

**Test manual de la ruta:**
```bash
curl -X POST https://aibaasongsbackend-production.up.railway.app/webhook/stripe
```

Respuesta esperada:
```json
{
  "error": "Webhook Error: ..."
}
```

Si recibes un 404, la ruta no existe. Si recibes el error de webhook, la ruta SÍ existe.

---

## Logs a buscar en Railway

Después de actualizar y hacer un pago de prueba, busca en los logs:

```
📨 Webhook recibido: checkout.session.completed
✅ Checkout Session completado: cs_xxxxx
💳 Payment Intent: pi_xxxxx
💰 Monto pagado: 29.99 USD
📦 Obteniendo items del cart: [1, 2]
📝 Creando orden...
✅ Orden creada: 123
📝 Creando order items...
✅ Order items creados: 2
🧹 Limpiando cart del usuario...
🎵 Iniciando generación de canciones con Suno...
✅ Proceso de checkout session completado exitosamente
```

Si ves estos logs, **todo está funcionando** ✅
