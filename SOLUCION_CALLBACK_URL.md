# 🚀 Solución: Usar ngrok para testing de Suno API

## Problema Identificado

La API de Suno requiere OBLIGATORIAMENTE un `callbackUrl`. No es opcional.

Respuesta de la API:
```json
{
  "code": 400,
  "msg": "Please enter callBackUrl.",
  "data": null
}
```

---

## ✅ SOLUCIÓN 1: Usar ngrok (Recomendado para testing)

### Paso 1: Instalar ngrok

**Opción A - Con npm:**
```bash
npm install -g ngrok
```

**Opción B - Descargar directo:**
https://ngrok.com/download

### Paso 2: Iniciar tu servidor backend

```bash
npm start
```

Tu servidor debería estar corriendo en `http://localhost:3000` (o el puerto que uses)

### Paso 3: En otra terminal, iniciar ngrok

```bash
ngrok http 3000
```

**Salida esperada:**
```
Session Status                online
Account                       tu-cuenta (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Forwarding                    https://abcd1234.ngrok.io -> http://localhost:3000
```

### Paso 4: Copiar el URL de ngrok

Copia el URL que empieza con `https://` (ejemplo: `https://abcd1234.ngrok.io`)

### Paso 5: Configurar en .env

Agrega a tu archivo `.env`:

```bash
SUNO_CALLBACK_URL=https://abcd1234.ngrok.io/webhook/suno
```

**IMPORTANTE:** Reemplaza `abcd1234.ngrok.io` con TU URL de ngrok

### Paso 6: Reiniciar servidor

```bash
# Ctrl+C para detener el servidor
npm start
```

### Paso 7: Probar nuevamente

```bash
node test-suno-api.js
```

Ahora debería funcionar y devolver IDs válidos.

---

## ✅ SOLUCIÓN 2: Usar servidor público (Producción)

Si ya tienes un servidor desplegado:

### Opción A - Railway:
```bash
SUNO_CALLBACK_URL=https://tu-app.railway.app/webhook/suno
```

### Opción B - Render:
```bash
SUNO_CALLBACK_URL=https://tu-app.onrender.com/webhook/suno
```

### Opción C - Heroku:
```bash
SUNO_CALLBACK_URL=https://tu-app.herokuapp.com/webhook/suno
```

### Opción D - Vercel/Netlify Functions:
```bash
SUNO_CALLBACK_URL=https://tu-app.vercel.app/api/webhook/suno
```

---

## ✅ SOLUCIÓN 3: Contactar soporte de sunoapi.org

Pregunta si tienen:
- Un modo de desarrollo sin callbackUrl
- Un callbackUrl de prueba que puedan proporcionar
- Una forma alternativa de obtener las canciones

---

## 🔧 VERIFICAR QUE FUNCIONA

### Después de configurar ngrok:

1. **Verificar que el webhook está accesible:**
   ```bash
   curl https://tu-url-ngrok.ngrok.io/webhook/suno
   ```

   Debería devolver algo como:
   ```json
   {"received": true, "processed": 0}
   ```

2. **Probar generación de canción:**
   ```bash
   node test-suno-api.js
   ```

   Ahora debería devolver:
   ```json
   {
     "code": 200,
     "data": [{
       "id": "abc123...",
       ...
     }]
   }
   ```

3. **Ver logs del webhook:**

   Cuando Suno complete la canción, enviará un POST a tu webhook y verás en los logs:
   ```
   📨 Webhook de Suno recibido
   🎵 Procesando canción de Suno: abc123...
   ✅ Canción 1 actualizada con audio URL
   ```

---

## 📊 DIAGRAMA DEL FLUJO CON NGROK

```
1. Tu servidor local (localhost:3000)
   ↓
2. ngrok expone públicamente (https://abcd.ngrok.io)
   ↓
3. Backend llama a Suno con callbackUrl
   POST https://api.sunoapi.org/api/v1/generate
   {
     "callBackUrl": "https://abcd.ngrok.io/webhook/suno",
     ...
   }
   ↓
4. Suno genera la canción (~60 segundos)
   ↓
5. Suno envía callback a tu webhook
   POST https://abcd.ngrok.io/webhook/suno
   ↓
6. ngrok reenvía a localhost:3000/webhook/suno
   ↓
7. Tu backend actualiza la BD y envía email
```

---

## ⚠️ LIMITACIONES DE NGROK (Free)

- ⏰ La URL cambia cada vez que reinicias ngrok
- 🔄 Tendrás que actualizar `.env` con la nueva URL
- 📊 Límite de 40 conexiones/minuto

**Para producción:** Usa un servidor con dominio fijo.

---

## 🎯 RESUMEN RÁPIDO

```bash
# Terminal 1: Servidor backend
npm start

# Terminal 2: ngrok
ngrok http 3000

# Copiar URL de ngrok
# Ejemplo: https://abcd1234.ngrok.io

# Actualizar .env
SUNO_CALLBACK_URL=https://abcd1234.ngrok.io/webhook/suno

# Reiniciar servidor (Terminal 1)
Ctrl+C
npm start

# Probar
node test-suno-api.js
```

---

## ✅ SIGUIENTE PASO

Elige una opción:
1. **Testing/Desarrollo:** Usar ngrok (5 minutos para configurar)
2. **Producción:** Desplegar en servidor con dominio público
3. **Alternativa:** Contactar soporte de sunoapi.org

¿Cuál prefieres? 🚀
