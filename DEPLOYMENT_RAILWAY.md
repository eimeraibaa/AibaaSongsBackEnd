# 🚀 Guía de Despliegue en Railway - Aibaa Songs Backend

Esta guía te ayudará a desplegar el backend de Aibaa Songs en Railway paso a paso.

## 📋 Requisitos Previos

1. Una cuenta en [Railway.app](https://railway.app)
2. Tu repositorio de GitHub conectado
3. Las claves API necesarias:
   - Stripe (Secret Key y Webhook Secret)
   - OpenAI API Key
   - Suno API Key
   - Credenciales de email (Gmail con contraseña de aplicación)

---

## 🎯 Paso 1: Crear Nuevo Proyecto en Railway

1. Ingresa a [Railway.app](https://railway.app) y haz login
2. Click en **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Busca y selecciona tu repositorio: `AibaaSongsBackEnd`
5. Railway detectará automáticamente que es un proyecto Node.js

---

## 🗄️ Paso 2: Agregar PostgreSQL

Railway necesita una base de datos PostgreSQL para tu backend:

1. En tu proyecto de Railway, click en **"+ New"**
2. Selecciona **"Database"** → **"Add PostgreSQL"**
3. Railway creará automáticamente una base de datos PostgreSQL
4. La variable `DATABASE_URL` se generará automáticamente

---

## 🔧 Paso 3: Configurar Variables de Entorno

En tu servicio de backend en Railway, ve a la pestaña **"Variables"** y agrega las siguientes:

### Variables Esenciales

```bash
# Base de Datos (Railway la genera automáticamente)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Stripe - Obtén estas claves en https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx

# OpenAI - Obtén tu clave en https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Suno AI - Obtén tu clave de Suno
SUNO_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUNO_CALLBACK_URL=${{RAILWAY_PUBLIC_DOMAIN}}/webhook/suno-callback

# Email - Usa Gmail con contraseña de aplicación
# Tutorial: https://support.google.com/accounts/answer/185833
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx
EMAIL_FROM=noreply@aibaasongs.com

# URLs - Railway las genera automáticamente
FRONTEND_URL=https://tu-frontend.com
BACKEND_URL=${{RAILWAY_PUBLIC_DOMAIN}}

# Seguridad - Genera una clave segura aleatoria
SESSION_SECRET=genera-una-clave-super-segura-aleatoria-aqui-minimo-32-caracteres

# Webhook N8N (Opcional)
WELCOME_WEBHOOK_URL=https://n8n.jengoautomatization.site/webhook/welcomeEmail

# Entorno
NODE_ENV=production
PORT=3000
```

### 📝 Notas Importantes sobre Variables:

- **`${{Postgres.DATABASE_URL}}`**: Railway automáticamente conecta tu base de datos PostgreSQL
- **`${{RAILWAY_PUBLIC_DOMAIN}}`**: Railway proporciona el dominio público de tu servicio
- **`SESSION_SECRET`**: Genera una clave aleatoria y segura. Ejemplo usando Node.js:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Email**: Para Gmail, necesitas generar una "Contraseña de Aplicación" desde tu cuenta de Google

---

## 🔐 Paso 4: Configurar Stripe Webhooks

Para que los pagos funcionen correctamente, necesitas configurar el webhook de Stripe:

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click en **"Add endpoint"**
3. Usa la URL: `https://tu-dominio-railway.up.railway.app/webhook/stripe`
4. Selecciona los eventos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copia el **Signing Secret** y úsalo en `STRIPE_WEBHOOK_SECRET`

---

## 🎵 Paso 5: Configurar Suno AI Callback

Si Suno AI requiere un callback URL:

1. Usa: `https://tu-dominio-railway.up.railway.app/webhook/suno-callback`
2. Configura esta URL en tu cuenta de Suno AI
3. Asegúrate de que `SUNO_CALLBACK_URL` esté configurado en Railway

---

## 🚀 Paso 6: Desplegar

1. Railway detectará automáticamente que es un proyecto Node.js
2. Usará el comando `npm start` del `package.json`
3. El despliegue iniciará automáticamente
4. Espera a que el despliegue termine (puede tardar 2-5 minutos)

### Verificar el Despliegue:

- Ve a la pestaña **"Deployments"** para ver el progreso
- Revisa los **"Logs"** para confirmar que no hay errores
- Busca el mensaje: `Server running on http://localhost:3000`

---

## 🌐 Paso 7: Obtener tu URL de Producción

1. En Railway, ve a tu servicio de backend
2. Click en la pestaña **"Settings"**
3. En **"Networking"** → **"Public Networking"**
4. Railway generará una URL pública tipo: `https://aibaasongs-production.up.railway.app`
5. Copia esta URL y actualiza:
   - `BACKEND_URL` en Railway
   - Tu frontend para que apunte a esta URL
   - Webhooks en Stripe y Suno

---

## ✅ Paso 8: Verificar que Todo Funciona

### 1. Verificar que el servidor está corriendo:

```bash
curl https://tu-dominio-railway.up.railway.app/
```

### 2. Probar el endpoint de usuarios:

```bash
curl https://tu-dominio-railway.up.railway.app/users
```

### 3. Verificar logs en Railway:

- Ve a la pestaña **"Logs"** de tu servicio
- Deberías ver mensajes como:
  ```
  Server running on http://localhost:3000
  Base de datos conectada y sincronizada
  ```

### 4. Probar funcionalidades principales:

- ✅ Registro de usuario
- ✅ Login
- ✅ Creación de solicitud de canción
- ✅ Proceso de pago con Stripe
- ✅ Generación de canción con Suno AI
- ✅ Emails de notificación

---

## 🔄 Actualizar el Despliegue

Railway se despliega automáticamente cuando haces push a tu rama principal:

```bash
git add .
git commit -m "Update backend"
git push origin main
```

Railway detectará el push y redesplegará automáticamente.

---

## 🐛 Solución de Problemas Comunes

### Error: "Cannot connect to database"

**Solución:**
- Verifica que la base de datos PostgreSQL esté corriendo en Railway
- Verifica que `DATABASE_URL` esté configurada correctamente
- Revisa los logs de PostgreSQL en Railway

### Error: "Stripe webhook signature verification failed"

**Solución:**
- Asegúrate de que `STRIPE_WEBHOOK_SECRET` esté correctamente configurado
- Verifica que la URL del webhook en Stripe Dashboard sea correcta
- Asegúrate de estar usando la clave correcta (test vs production)

### Error: "Session secret not set"

**Solución:**
- Asegúrate de que `SESSION_SECRET` esté configurada en Railway
- La clave debe ser una cadena aleatoria y segura de al menos 32 caracteres

### Error: "OpenAI API key invalid"

**Solución:**
- Verifica que tu clave de OpenAI sea válida
- Asegúrate de tener créditos disponibles en tu cuenta de OpenAI
- Verifica que la clave tenga los permisos necesarios

### Error: "Port already in use"

**Solución:**
- Railway maneja automáticamente los puertos
- Asegúrate de que tu código use `process.env.PORT`
- No es necesario exponer el puerto manualmente

### La base de datos no se sincroniza

**Solución:**
- Railway puede tardar unos segundos en conectar la base de datos
- Revisa los logs para ver errores de Sequelize
- Verifica que todas las tablas se hayan creado correctamente

---

## 📊 Monitoreo y Mantenimiento

### Ver Logs en Tiempo Real:

1. Ve a tu proyecto en Railway
2. Selecciona el servicio de backend
3. Click en la pestaña **"Logs"**
4. Los logs se actualizan en tiempo real

### Métricas:

Railway proporciona métricas automáticas:
- Uso de CPU
- Uso de Memoria
- Uso de Disco
- Tráfico de Red

### Base de Datos:

- Railway hace backups automáticos de tu base de datos PostgreSQL
- Puedes ver conexiones activas y uso en la pestaña de PostgreSQL

---

## 💰 Costos Estimados

Railway tiene un plan gratuito con límites generosos:

- **Plan Free (Hobby):**
  - $5 USD de crédito gratis al mes
  - Suficiente para proyectos pequeños

- **Plan Developer ($5 USD/mes):**
  - $5 USD de crédito incluido
  - Mejor para proyectos en producción

Los costos reales dependerán del uso de recursos (CPU, RAM, tráfico).

---

## 🔒 Mejores Prácticas de Seguridad

1. **Nunca** compartas tus claves API en el código
2. **Usa variables de entorno** para toda información sensible
3. **Genera un SESSION_SECRET único y fuerte** para producción
4. **Usa claves de Stripe en modo live** solo en producción
5. **Habilita CORS** solo para tu dominio de frontend
6. **Mantén tus dependencias actualizadas** regularmente
7. **Revisa los logs** periódicamente por actividad sospechosa

---

## 📚 Recursos Adicionales

- [Documentación de Railway](https://docs.railway.app/)
- [Stripe API Docs](https://stripe.com/docs/api)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Sequelize Docs](https://sequelize.org/docs/v6/)
- [Express.js Docs](https://expressjs.com/)

---

## 🆘 Soporte

Si tienes problemas con el despliegue:

1. Revisa los logs en Railway
2. Verifica que todas las variables de entorno estén configuradas
3. Consulta la documentación de Railway
4. Revisa los issues del repositorio

---

## ✨ ¡Listo!

Tu backend de Aibaa Songs debería estar ahora funcionando en Railway. 🎉

Recuerda actualizar tu frontend para que apunte a la nueva URL de producción.

**URL de tu backend:** `https://tu-dominio-railway.up.railway.app`

¡Feliz despliegue! 🚀🎵
