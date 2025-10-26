# Guía de Verificación del Webhook de Suno

Esta guía te ayudará a verificar y solucionar problemas con el webhook de Suno.

## 📋 Tabla de Contenidos

1. [Verificación Rápida](#verificación-rápida)
2. [Configuración del .env](#configuración-del-env)
3. [Pruebas del Webhook](#pruebas-del-webhook)
4. [Solución de Problemas](#solución-de-problemas)
5. [FAQ](#faq)

---

## 🔍 Verificación Rápida

### Paso 1: Verificar la configuración

Ejecuta este endpoint para ver un diagnóstico completo:

```bash
curl http://localhost:3000/webhook/suno-config
```

O abre en tu navegador:
```
http://localhost:3000/webhook/suno-config
```

Esto te mostrará:
- ✅ Si `SUNO_CALLBACK_URL` está configurado
- ✅ Si la URL es válida
- ✅ Recomendaciones específicas para tu configuración
- ✅ Instrucciones de cómo probar

### Paso 2: Simular un webhook

Ejecuta este script para enviar un webhook de prueba:

```bash
node test-webhook.js
```

Esto enviará un webhook falso a tu servidor para verificar que el endpoint funciona.

---

## ⚙️ Configuración del .env

Tu archivo `.env` debe tener esta variable configurada:

```env
# Suno Callback URL - DEBE SER UNA URL PÚBLICA
SUNO_CALLBACK_URL=https://tu-dominio.ngrok-free.dev/webhook/suno
```

### ⚠️ Importante:

1. **DEBE ser una URL pública** (no localhost)
2. **DEBE terminar en** `/webhook/suno`
3. **DEBE usar HTTPS** (ngrok lo proporciona automáticamente)

### ❌ Configuraciones INCORRECTAS:

```env
# ❌ Localhost no funciona (Suno no puede acceder)
SUNO_CALLBACK_URL=http://localhost:3000/webhook/suno

# ❌ Falta el path /webhook/suno
SUNO_CALLBACK_URL=https://abc123.ngrok-free.app

# ❌ Path incorrecto
SUNO_CALLBACK_URL=https://abc123.ngrok-free.app/suno
```

### ✅ Configuraciones CORRECTAS:

```env
# ✅ Con ngrok
SUNO_CALLBACK_URL=https://abc123.ngrok-free.app/webhook/suno

# ✅ Con tu dominio propio
SUNO_CALLBACK_URL=https://api.tudominio.com/webhook/suno

# ✅ Con Railway/Render/Heroku
SUNO_CALLBACK_URL=https://tu-app.up.railway.app/webhook/suno
```

---

## 🧪 Pruebas del Webhook

### Opción 1: Prueba Simulada (Recomendado primero)

```bash
# 1. Ejecuta el script de prueba
node test-webhook.js

# 2. Verifica en los logs de tu servidor que veas:
# "📨 WEBHOOK DE SUNO RECIBIDO"
```

**Resultado esperado:**
```
========================================
🧪 PRUEBA DE WEBHOOK DE SUNO
========================================

📍 URL del webhook: http://localhost:3000/webhook/suno

📤 Enviando webhook de prueba...
========================================

✅ Respuesta recibida:
  - Status: 200
  - Status Text: OK
  - Body: { "received": true, ... }

========================================
✅ WEBHOOK FUNCIONA CORRECTAMENTE
========================================
```

### Opción 2: Prueba Real con Suno

```bash
# 1. Genera una canción desde tu frontend o Postman
# 2. Espera ~60 segundos
# 3. Monitorea los logs del servidor
```

**Logs esperados:**

```
🎵 Generando canción con Suno AI...
✅ FORMATO CON CALLBACK DETECTADO
TaskId: abc123...
📨 Endpoint del webhook: https://abc123.ngrok-free.dev/webhook/suno

... (espera ~60 segundos) ...

========================================
📨 WEBHOOK DE SUNO RECIBIDO
========================================
📊 Datos extraídos: {
  taskId: 'abc123...',
  callbackType: 'text',
  ...
}
ℹ️ Webhook con callbackType="text" - esperando webhook "complete"

... (espera ~30 segundos más) ...

========================================
📨 WEBHOOK DE SUNO RECIBIDO
========================================
📊 Datos extraídos: {
  taskId: 'abc123...',
  callbackType: 'complete',
  ...
}
✅ Webhook "complete" recibido - procesando canciones...
🎵 Procesando canción de Suno: xyz789...
✅ Canción 1 actualizada con audio URL desde webhook de Suno
```

---

## 🐛 Solución de Problemas

### Problema 1: El webhook NO llega

**Síntomas:**
- No ves "📨 WEBHOOK DE SUNO RECIBIDO" en los logs
- La canción se crea pero nunca se actualiza con el audio

**Soluciones:**

1. **Verifica que ngrok esté corriendo:**
   ```bash
   # Debe estar en una terminal separada
   ngrok http 3000
   ```

2. **Verifica que la URL en el .env coincida con ngrok:**
   ```bash
   # En ngrok verás algo como:
   # Forwarding: https://abc123.ngrok-free.app -> http://localhost:3000

   # En tu .env debe ser:
   SUNO_CALLBACK_URL=https://abc123.ngrok-free.app/webhook/suno
   ```

3. **Reinicia el servidor después de cambiar el .env:**
   ```bash
   # Ctrl+C para detener
   # npm start para iniciar de nuevo
   ```

4. **Verifica que el endpoint esté accesible públicamente:**
   ```bash
   # Desde tu navegador, abre:
   https://abc123.ngrok-free.app/webhook/suno-config

   # Deberías ver el diagnóstico
   ```

### Problema 2: El webhook llega pero da error

**Síntomas:**
- Ves "📨 WEBHOOK DE SUNO RECIBIDO" pero luego hay errores
- Ves "❌ Webhook de Suno con error"

**Soluciones:**

1. **Verifica que el formato sea correcto:**
   - Compara los logs con el ejemplo en `test-webhook.js`

2. **Revisa los logs completos:**
   - Busca el stack trace del error
   - Verifica que la canción exista en la BD

### Problema 3: La canción no se encuentra en BD

**Síntomas:**
- "⚠️ Canción no encontrada en BD"

**Soluciones:**

1. **Verifica que el taskId coincida:**
   ```sql
   -- Consulta en tu BD
   SELECT id, sunoSongId, status FROM "Songs" ORDER BY id DESC LIMIT 5;

   -- El sunoSongId debe coincidir con el taskId del webhook
   ```

2. **Si no coincide, revisa el código de creación de la canción**

---

## ❓ FAQ

### ¿Por qué necesito ngrok?

Suno necesita enviar el webhook a una URL pública. Tu `localhost` no es accesible desde Internet. Ngrok crea un túnel que hace tu servidor local accesible públicamente.

### ¿Tengo que pagar por ngrok?

No, la versión gratuita es suficiente para desarrollo.

### ¿Qué pasa si no configuro el webhook?

El sistema funcionará de todas formas, pero usará **polling** (consultas periódicas) en lugar de webhooks. Esto es:
- ❌ Más lento (consulta cada 90 segundos)
- ❌ Consume más recursos
- ❌ Más propenso a timeouts

### ¿Puedo usar otro servicio además de ngrok?

Sí, puedes usar:
- **Localtunnel**: `npm install -g localtunnel && lt --port 3000`
- **Serveo**: `ssh -R 80:localhost:3000 serveo.net`
- **Desplegar en producción**: Railway, Render, Heroku, etc.

### ¿El webhook funciona en producción?

Sí, cuando despliegues tu app en Railway/Render/Heroku, ya tendrás una URL pública permanente. Solo configura:

```env
SUNO_CALLBACK_URL=https://tu-app-production.com/webhook/suno
```

---

## 📞 Endpoints de Ayuda

### Diagnóstico completo
```
GET http://localhost:3000/webhook/suno-config
```

### Probar envío de email
```
POST http://localhost:3000/webhook/test-email/1
```

### Simular webhook
```bash
node test-webhook.js
```

---

## ✅ Checklist de Verificación

Antes de generar una canción, asegúrate de que:

- [ ] Ngrok está corriendo
- [ ] `SUNO_CALLBACK_URL` está en el `.env`
- [ ] La URL en `.env` coincide con la de ngrok
- [ ] La URL termina en `/webhook/suno`
- [ ] Reiniciaste el servidor después de cambiar `.env`
- [ ] `GET /webhook/suno-config` muestra ✅ SUCCESS
- [ ] `node test-webhook.js` funciona correctamente

Si todos los ítems están marcados, ¡el webhook debería funcionar!

---

## 🆘 ¿Aún tienes problemas?

1. **Ejecuta el diagnóstico:**
   ```bash
   curl http://localhost:3000/webhook/suno-config
   ```

2. **Copia los logs completos** desde que generas la canción hasta 2 minutos después

3. **Revisa que coincidan:**
   - URL en ngrok
   - URL en `.env`
   - URL que Suno usa (visible en los logs de generación)

4. **Verifica la base de datos:**
   ```sql
   SELECT * FROM "Songs" ORDER BY id DESC LIMIT 1;
   ```
   - El `sunoSongId` debe tener un valor
   - El `status` debe cambiar de 'generating' a 'completed'
