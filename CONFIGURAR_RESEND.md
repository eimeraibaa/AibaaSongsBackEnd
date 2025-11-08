# 📧 Configuración del Servicio de Email con Resend

Esta guía te ayudará a configurar el servicio de envío de emails usando **Resend**, una plataforma moderna y fácil de usar para enviar emails transaccionales.

## ✨ ¿Por qué Resend?

- 🆓 **100 emails gratis por día** (plan gratuito)
- ⚡ **Configuración súper rápida** (solo 5 minutos)
- 🎯 **Simple y confiable** (sin configuración SMTP complicada)
- 📊 **Dashboard con métricas** en tiempo real
- 🔒 **Seguro y confiable**

---

## 🚀 Guía Rápida (5 minutos)

### Paso 1: Crear cuenta en Resend

1. Ve a [https://resend.com](https://resend.com)
2. Haz clic en **"Sign Up"** o **"Get Started"**
3. Regístrate con tu email o GitHub
4. Confirma tu email

### Paso 2: Obtener tu API Key

1. Una vez dentro del dashboard, ve a **"API Keys"**
2. Haz clic en **"Create API Key"**
3. Dale un nombre (ejemplo: "MakeUrSongs Production")
4. Selecciona permisos: **"Sending access"**
5. Haz clic en **"Create"**
6. **⚠️ IMPORTANTE:** Copia la API key inmediatamente (solo se muestra una vez)
   - Se verá algo como: `re_123abc456def789ghi012jkl345mno678`

### Paso 3: Configurar variables de entorno

1. En la raíz de tu proyecto, crea un archivo `.env` (si no existe):

```bash
# En la terminal:
touch .env
```

2. Abre el archivo `.env` y agrega:

```env
# Resend Email Service
RESEND_API_KEY=re_tu_api_key_aqui

# Email que aparecerá como remitente
# IMPORTANTE: Por defecto, usa onboarding@resend.dev (funciona inmediatamente)
# Para usar tu propio dominio, sigue los pasos de verificación en Resend
EMAIL_FROM=onboarding@resend.dev

# URLs para links en los emails
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
```

3. **Guarda el archivo** `.env`

### Paso 4: Probar el servicio de email

Ejecuta el script de prueba:

```bash
node test-resend-email.js tu-email@ejemplo.com
```

Reemplaza `tu-email@ejemplo.com` con tu email real para recibir el email de prueba.

Si todo está configurado correctamente, verás:

```
✅ ¡Email enviado exitosamente!
📬 Message ID: abc123...
🎉 Revisa tu bandeja de entrada
```

---

## 📧 Usar tu propio dominio (Opcional)

Por defecto, los emails se envían desde `onboarding@resend.dev`. Si quieres usar tu propio dominio (ej: `noreply@tudominio.com`):

### 1. Agregar tu dominio en Resend

1. En el dashboard de Resend, ve a **"Domains"**
2. Haz clic en **"Add Domain"**
3. Ingresa tu dominio (ej: `tudominio.com`)
4. Sigue las instrucciones para verificar el dominio:
   - Agrega los registros DNS (SPF, DKIM, DMARC)
   - Espera la verificación (puede tomar unos minutos)

### 2. Actualizar EMAIL_FROM

Una vez verificado tu dominio, actualiza en tu `.env`:

```env
EMAIL_FROM=noreply@tudominio.com
# o
EMAIL_FROM=contacto@tudominio.com
# o cualquier dirección de tu dominio verificado
```

---

## 🧪 Testing y Desarrollo

### Modo de Prueba

Durante el desarrollo, puedes usar `onboarding@resend.dev` sin verificar ningún dominio. Los emails se enviarán normalmente.

### Script de Prueba

```bash
# Enviar email de prueba
node test-resend-email.js tu-email@ejemplo.com
```

Este script enviará 2 emails:
1. ✅ Email de "canciones listas"
2. ⚠️ Email de "error en generación"

### Ver logs de emails enviados

En el dashboard de Resend:
1. Ve a **"Logs"**
2. Verás todos los emails enviados con su estado
3. Puedes ver el contenido exacto que se envió

---

## 🔧 Integración con tu aplicación

El servicio ya está integrado en tu proyecto. Los emails se envían automáticamente cuando:

1. **Las canciones de un usuario están listas** → Email con links de descarga
2. **Hay un error en la generación** → Email de notificación de error

### Archivos importantes:

```
src/services/resendEmailService.js  → Servicio de email (nuevo)
src/controllers/song.controller.js  → Usa el servicio para notificar
src/controllers/webhook.controller.js → Usa el servicio en webhooks
```

### Actualizar los controladores para usar Resend

Para empezar a usar el nuevo servicio de Resend, necesitas actualizar las importaciones en los controladores:

**Cambiar de:**
```javascript
import { emailService } from '../services/emailService.js';
```

**A:**
```javascript
import { resendEmailService as emailService } from '../services/resendEmailService.js';
```

O usar directamente:
```javascript
import { resendEmailService } from '../services/resendEmailService.js';

// Luego usar:
await resendEmailService.sendSongsReadyEmail(userEmail, songs, orderId);
```

---

## 📊 Límites del Plan Gratuito

| Característica | Plan Gratuito |
|---------------|---------------|
| Emails por día | 100 |
| Emails por mes | 3,000 |
| Dominios verificados | 1 |
| API Keys | Ilimitadas |
| Retención de logs | 30 días |

Para más emails, puedes actualizar al plan de pago (muy económico).

---

## ❓ Problemas Comunes

### ❌ Error: "Email service not configured"

**Causa:** No existe `RESEND_API_KEY` en el archivo `.env`

**Solución:**
1. Verifica que el archivo `.env` existe en la raíz del proyecto
2. Verifica que `RESEND_API_KEY` está configurado
3. Reinicia el servidor después de editar `.env`

### ❌ Error: "Invalid API key"

**Causa:** La API key es incorrecta o expiró

**Solución:**
1. Ve a tu dashboard de Resend
2. Genera una nueva API key
3. Actualiza `.env` con la nueva key
4. Reinicia el servidor

### ❌ Los emails no llegan

**Posibles causas:**

1. **Spam:** Revisa tu carpeta de spam
2. **Email incorrecto:** Verifica que el email del usuario es válido
3. **Dominio no verificado:** Si usas tu propio dominio, verifica que esté configurado correctamente en Resend

**Solución:**
1. Revisa los logs en el dashboard de Resend
2. Busca el email por Message ID
3. Verifica el estado (delivered, bounced, etc.)

---

## 🎯 Mejores Prácticas

### 1. Variables de entorno por ambiente

**Desarrollo (`.env`):**
```env
RESEND_API_KEY=re_test_key_desarrollo
EMAIL_FROM=onboarding@resend.dev
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
```

**Producción (variables de entorno del servidor):**
```env
RESEND_API_KEY=re_live_key_produccion
EMAIL_FROM=noreply@tudominio.com
FRONTEND_URL=https://tudominio.com
BACKEND_URL=https://api.tudominio.com
```

### 2. Seguridad

- ⚠️ **NUNCA** subas el archivo `.env` a Git
- ⚠️ **NUNCA** expongas tu API key en el código
- ✅ Usa variables de entorno en producción
- ✅ Genera API keys separadas para desarrollo y producción

### 3. Monitoreo

- Revisa regularmente los logs en Resend
- Monitorea la tasa de apertura (open rate)
- Verifica que no haya bounces (emails rebotados)

---

## 📚 Recursos Adicionales

- [Documentación oficial de Resend](https://resend.com/docs)
- [API Reference](https://resend.com/docs/api-reference)
- [Verificar dominios](https://resend.com/docs/dashboard/domains/introduction)
- [Mejores prácticas](https://resend.com/docs/knowledge-base/best-practices)

---

## 🆘 Soporte

Si tienes problemas:

1. Revisa esta guía completamente
2. Verifica los logs en el dashboard de Resend
3. Ejecuta el script de prueba: `node test-resend-email.js`
4. Revisa los logs del servidor

---

**¡Listo! 🎉 Tu servicio de email está configurado y funcionando.**
