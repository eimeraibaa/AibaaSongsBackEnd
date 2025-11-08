# 📧 Configuración de Email para Notificaciones

## ⚠️ Problema Actual

El servicio de email está **desactivado automáticamente** porque:

1. **No hay credenciales de email configuradas** (EMAIL_USER y EMAIL_PASSWORD)
2. **El firewall del servidor bloquea conexiones SMTP** (común en Railway, Render, Heroku, Docker)

### ¿Qué significa esto?

- ✅ Tu aplicación funciona normalmente
- ✅ Las canciones se generan correctamente
- ❌ Los usuarios NO reciben emails de notificación
- ℹ️ Los logs mostrarán: "Email service desactivado - omitiendo envío de email"

---

## Solución

## ✅ Opción 1: Configurar Gmail (Recomendado para Producción)

### Paso 1: Habilitar "Contraseñas de Aplicación" en Gmail

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. En el menú izquierdo, selecciona **Seguridad**
3. En "Acceso a Google", activa **Verificación en dos pasos** (si no está activada)
4. Una vez activada, vuelve a **Seguridad**
5. En "Acceso a Google", selecciona **Contraseñas de aplicaciones**
6. Selecciona:
   - **App**: Correo
   - **Dispositivo**: Otro (personalizado) → escribe "MakeUrSong Backend"
7. Haz clic en **Generar**
8. **Copia la contraseña** generada (16 caracteres, sin espacios)

### Paso 2: Agregar a tu archivo `.env`

```bash
# Email Configuration (Gmail)
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=la-contraseña-de-app-generada
EMAIL_FROM=tu-email@gmail.com
```

**IMPORTANTE:**
- ❌ NO uses tu contraseña normal de Gmail
- ✅ Usa la "Contraseña de aplicación" que acabas de generar
- ✅ Reemplaza `tu-email@gmail.com` con tu email real
- ✅ No pongas espacios en la contraseña

### Ejemplo:
```bash
EMAIL_USER=makeyursong@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop  # Esta es la que Google te da
EMAIL_FROM=makeyursong@gmail.com
```

### Paso 3: Reinicia el servidor

```bash
# Detén el servidor (Ctrl+C si está corriendo)
# Luego reinicia
npm start
```

### ¿Por qué no funciona el modo de prueba (Ethereal)?

En entornos de producción (Railway, Render, Heroku), los puertos SMTP (25, 587, 465) están bloqueados por seguridad. Por eso el sistema automáticamente desactiva los emails en lugar de fallar con timeout.

---

## 🔍 Verificar Configuración

Después de configurar, puedes probar con:

```bash
# Desde tu terminal
curl -X POST http://localhost:3000/webhook/test-email/1
```

Esto intentará enviar un email de prueba para la orden #1.

---

## ❌ Problemas Comunes

### 1. "Invalid login: 535-5.7.8 Username and Password not accepted"
- ❌ Estás usando tu contraseña normal de Gmail
- ✅ Debes usar una "Contraseña de aplicación"

### 2. "Connection timeout" o "ETIMEDOUT"
- ❌ Las variables de entorno no están cargadas
- ✅ Verifica que tu `.env` esté en la raíz del proyecto
- ✅ Reinicia el servidor después de editar `.env`

### 3. "Less secure app access"
- ❌ Gmail ya no permite esto
- ✅ Debes usar "Contraseñas de aplicación" con verificación en dos pasos

---

## 📝 Variables de Entorno Completas

Agrega estas líneas a tu archivo `.env`:

```bash
# ====================================
# EMAIL CONFIGURATION
# ====================================
# Para Gmail: usa una "Contraseña de aplicación"
# https://myaccount.google.com/apppasswords
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-contraseña-de-app
EMAIL_FROM=tu-email@gmail.com

# ====================================
# FRONTEND & BACKEND URLs
# ====================================
# Usadas en los links de los emails
FRONTEND_URL=https://tu-frontend.com
BACKEND_URL=https://tu-backend.com
```

---

## ✅ Código Arreglado

He corregido el código para que:
1. ✅ Maneje correctamente el setup asíncrono de Ethereal
2. ✅ Espere a que el transporter esté listo antes de enviar emails
3. ✅ No falle con timeout cuando no hay credenciales configuradas

Ahora el modo de prueba (Ethereal) funcionará correctamente incluso sin configuración.
