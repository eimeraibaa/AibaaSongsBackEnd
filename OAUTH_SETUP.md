# Configuración de Autenticación OAuth

Este documento describe cómo configurar y usar la autenticación OAuth con Google y Facebook en AibaaSongsBackEnd.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Configuración de Google OAuth](#configuración-de-google-oauth)
- [Configuración de Facebook OAuth](#configuración-de-facebook-oauth)
- [Variables de Entorno](#variables-de-entorno)
- [Endpoints Disponibles](#endpoints-disponibles)
- [Flujo de Autenticación](#flujo-de-autenticación)
- [Migración de Base de Datos](#migración-de-base-de-datos)
- [Integración Frontend](#integración-frontend)
- [Solución de Problemas](#solución-de-problemas)

## ✨ Características

- ✅ Autenticación con Google OAuth 2.0
- ✅ Autenticación con Facebook OAuth
- ✅ Vinculación automática de cuentas por email
- ✅ Soporte para múltiples métodos de autenticación por usuario
- ✅ Almacenamiento de foto de perfil de proveedores OAuth
- ✅ Sesiones persistentes en PostgreSQL
- ✅ Logout seguro

## 🔐 Configuración de Google OAuth

### Paso 1: Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. Navega a **APIs & Services > Credentials**

### Paso 2: Habilitar Google+ API

1. Ve a **APIs & Services > Library**
2. Busca "Google+ API"
3. Haz clic en "Enable"

### Paso 3: Crear Credenciales OAuth 2.0

1. En **Credentials**, haz clic en **Create Credentials > OAuth client ID**
2. Selecciona **Web application**
3. Configura las URLs autorizadas:

   **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   https://tu-dominio-produccion.com
   ```

   **Authorized redirect URIs:**
   ```
   http://localhost:3000/users/auth/google/callback
   https://tu-dominio-produccion.com/users/auth/google/callback
   ```

4. Copia el **Client ID** y **Client Secret**

### Paso 4: Configurar Variables de Entorno

Agrega a tu archivo `.env`:

```bash
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
```

## 📘 Configuración de Facebook OAuth

### Paso 1: Crear Aplicación en Facebook Developers

1. Ve a [Facebook Developers](https://developers.facebook.com)
2. Haz clic en **My Apps > Create App**
3. Selecciona **Consumer** como tipo de app
4. Completa los detalles de la aplicación

### Paso 2: Agregar Facebook Login

1. En el dashboard de tu app, haz clic en **Add Product**
2. Encuentra **Facebook Login** y haz clic en **Set Up**
3. Selecciona **Web** como plataforma

### Paso 3: Configurar OAuth Redirect URIs

1. Ve a **Facebook Login > Settings**
2. En **Valid OAuth Redirect URIs**, agrega:

   ```
   http://localhost:3000/users/auth/facebook/callback
   https://tu-dominio-produccion.com/users/auth/facebook/callback
   ```

3. Guarda los cambios

### Paso 4: Obtener Credenciales

1. Ve a **Settings > Basic**
2. Copia el **App ID** y **App Secret**

### Paso 5: Configurar Variables de Entorno

Agrega a tu archivo `.env`:

```bash
FACEBOOK_APP_ID=tu-app-id
FACEBOOK_APP_SECRET=tu-app-secret
```

## 🌍 Variables de Entorno

Asegúrate de tener todas estas variables configuradas en tu `.env`:

```bash
# Base de datos
DATABASE_URL=postgresql://usuario:password@localhost:5432/nombre_db

# Sesiones
SESSION_SECRET=tu-clave-secreta-super-segura

# URLs de la aplicación
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# Google OAuth
GOOGLE_CLIENT_ID=xxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Facebook OAuth
FACEBOOK_APP_ID=xxxxxxxxxxxxxxxx
FACEBOOK_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Node Environment
NODE_ENV=development
```

## 🔌 Endpoints Disponibles

### Autenticación Local (Email/Password)

```bash
# Registro
POST /users/register
Content-Type: application/json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123",
  "firstName": "Juan",
  "lastName": "Pérez"
}

# Login
POST /users/login
Content-Type: application/json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}

# Obtener usuario autenticado
GET /users/auth

# Actualizar perfil
PATCH /users/profile
Content-Type: application/json
{
  "firstName": "Nuevo Nombre",
  "lastName": "Nuevo Apellido"
}

# Logout
POST /users/logout
```

### Autenticación OAuth

```bash
# Google OAuth - Iniciar autenticación
GET /users/auth/google

# Google OAuth - Callback (manejado automáticamente)
GET /users/auth/google/callback

# Facebook OAuth - Iniciar autenticación
GET /users/auth/facebook

# Facebook OAuth - Callback (manejado automáticamente)
GET /users/auth/facebook/callback
```

## 🔄 Flujo de Autenticación

### Autenticación con Google/Facebook

1. **Usuario hace clic en "Login con Google/Facebook"** en el frontend
2. **Redirección a OAuth provider**
   - Frontend redirige a: `http://localhost:3000/users/auth/google` o `/users/auth/facebook`
3. **Usuario autoriza la aplicación** en Google/Facebook
4. **Callback del provider**
   - Google/Facebook redirige a: `/users/auth/google/callback` o `/users/auth/facebook/callback`
5. **Backend procesa la autenticación**
   - Busca usuario existente por `googleId` o `facebookId`
   - Si no existe, busca por email
   - Si existe por email, vincula la cuenta OAuth
   - Si no existe, crea nuevo usuario
6. **Creación de sesión**
   - Passport.js crea sesión en PostgreSQL
   - Cookie de sesión se envía al navegador
7. **Redirección al frontend**
   - Éxito: `${FRONTEND_URL}/dashboard`
   - Error: `${FRONTEND_URL}/login?error=oauth_failed`

### Vinculación de Cuentas

Si un usuario ya tiene una cuenta con email `usuario@gmail.com` usando autenticación local, y luego inicia sesión con Google usando el mismo email:

1. El sistema detecta que el email ya existe
2. Actualiza el usuario existente con el `googleId`
3. El campo `authProvider` cambia a `'google'`
4. La foto de perfil se actualiza si está disponible
5. El usuario ahora puede iniciar sesión tanto con email/password como con Google

## 🗄️ Migración de Base de Datos

Para aplicar los cambios a la base de datos, ejecuta la migración:

```bash
# Conectarse a PostgreSQL
psql -U usuario -d nombre_db

# Ejecutar migración
\i migrations/add_oauth_fields_to_users.sql

# Verificar cambios
\d users
```

O si prefieres ejecutarlo desde la línea de comandos:

```bash
psql $DATABASE_URL -f migrations/add_oauth_fields_to_users.sql
```

### Campos agregados a la tabla `users`:

- `googleId` (VARCHAR, UNIQUE) - ID único de Google
- `facebookId` (VARCHAR, UNIQUE) - ID único de Facebook
- `authProvider` (VARCHAR, DEFAULT 'local') - Proveedor de autenticación
- `profilePicture` (VARCHAR) - URL de la foto de perfil
- `password` (ahora es NULLABLE) - Permite usuarios OAuth sin contraseña

## 💻 Integración Frontend

### Ejemplo con React

```jsx
// LoginPage.jsx
import React from 'react';

function LoginPage() {
  const handleGoogleLogin = () => {
    // Redirigir al endpoint de Google OAuth
    window.location.href = 'http://localhost:3000/users/auth/google';
  };

  const handleFacebookLogin = () => {
    // Redirigir al endpoint de Facebook OAuth
    window.location.href = 'http://localhost:3000/users/auth/facebook';
  };

  return (
    <div>
      <h1>Iniciar Sesión</h1>

      {/* Login con Google */}
      <button onClick={handleGoogleLogin}>
        <img src="/google-icon.svg" alt="Google" />
        Continuar con Google
      </button>

      {/* Login con Facebook */}
      <button onClick={handleFacebookLogin}>
        <img src="/facebook-icon.svg" alt="Facebook" />
        Continuar con Facebook
      </button>

      {/* Separador */}
      <div>O usa tu email</div>

      {/* Formulario de login tradicional */}
      <form onSubmit={handleEmailLogin}>
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Contraseña" />
        <button type="submit">Iniciar Sesión</button>
      </form>
    </div>
  );
}
```

### Ejemplo con HTML + JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <title>Login</title>
</head>
<body>
  <h1>Iniciar Sesión</h1>

  <!-- Login con Google -->
  <a href="http://localhost:3000/users/auth/google">
    <button>
      Continuar con Google
    </button>
  </a>

  <!-- Login con Facebook -->
  <a href="http://localhost:3000/users/auth/facebook">
    <button>
      Continuar con Facebook
    </button>
  </a>

  <!-- Formulario de login tradicional -->
  <form action="http://localhost:3000/users/login" method="POST">
    <input type="email" name="email" placeholder="Email" required />
    <input type="password" name="password" placeholder="Contraseña" required />
    <button type="submit">Iniciar Sesión</button>
  </form>
</body>
</html>
```

### Verificar Sesión Actual

```javascript
// Verificar si el usuario está autenticado
async function checkAuth() {
  try {
    const response = await fetch('http://localhost:3000/users/auth', {
      credentials: 'include' // Importante: incluir cookies
    });

    if (response.ok) {
      const user = await response.json();
      console.log('Usuario autenticado:', user);
      return user;
    } else {
      console.log('No autenticado');
      return null;
    }
  } catch (error) {
    console.error('Error al verificar autenticación:', error);
    return null;
  }
}
```

### Logout

```javascript
async function logout() {
  try {
    const response = await fetch('http://localhost:3000/users/logout', {
      method: 'POST',
      credentials: 'include'
    });

    if (response.ok) {
      console.log('Sesión cerrada exitosamente');
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
}
```

## 🔧 Solución de Problemas

### Error: "Redirect URI mismatch"

**Problema:** Google/Facebook rechaza la autenticación con error de URI.

**Solución:**
1. Verifica que las URLs de callback en Google/Facebook Console coincidan exactamente con tu `BACKEND_URL`
2. Asegúrate de incluir el protocolo (http:// o https://)
3. No incluyas barras finales (`/`) en las URLs
4. En desarrollo usa `http://localhost:3000`, no `http://127.0.0.1:3000`

### Error: "Sessions table not found"

**Problema:** La tabla de sesiones no existe en PostgreSQL.

**Solución:**
```bash
# La tabla se crea automáticamente, pero puedes verificar
psql $DATABASE_URL -c "SELECT * FROM sessions LIMIT 1;"
```

### Las cookies no se guardan

**Problema:** El usuario se autentica pero pierde la sesión al refrescar.

**Solución:**
1. Verifica que `credentials: 'include'` esté configurado en fetch/axios
2. En desarrollo, asegúrate de que frontend y backend estén en el mismo dominio o usa cookies SameSite=None
3. Verifica la configuración de CORS en `src/app.js`

### Usuario no puede iniciar sesión con email después de OAuth

**Problema:** Usuario creado con OAuth no puede usar autenticación local.

**Solución:**
Esto es por diseño. Los usuarios OAuth no tienen contraseña. Si quieres permitir ambos:
1. El usuario debe crear una contraseña desde su perfil
2. Implementa un endpoint para "agregar contraseña" en el backend

### Error: "Cannot find module 'passport-google-oauth20'"

**Problema:** Las dependencias OAuth no están instaladas.

**Solución:**
```bash
npm install passport-google-oauth20 passport-facebook
```

## 📚 Recursos Adicionales

- [Passport.js Documentation](http://www.passportjs.org/docs/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
- [Express Session Documentation](https://github.com/expressjs/session)

## 🚀 Producción

### Checklist para Producción

- [ ] Usar HTTPS en producción
- [ ] Configurar `NODE_ENV=production`
- [ ] Usar dominios reales en BACKEND_URL y FRONTEND_URL
- [ ] Actualizar URLs de callback en Google/Facebook Console
- [ ] Usar secretos seguros y únicos para `SESSION_SECRET`
- [ ] Configurar `secure: true` en cookies (ya configurado automáticamente)
- [ ] Habilitar rate limiting en endpoints de autenticación
- [ ] Configurar CORS solo para dominios autorizados
- [ ] Revisar permisos de base de datos
- [ ] Implementar logging de eventos de autenticación

### Ejemplo de Configuración de Producción

```bash
# .env (producción)
NODE_ENV=production
BACKEND_URL=https://api.tudominio.com
FRONTEND_URL=https://tudominio.com

# Asegúrate de actualizar estos URLs en:
# - Google Cloud Console (Authorized redirect URIs)
# - Facebook Developers (Valid OAuth Redirect URIs)
```

## 🤝 Contribuciones

Si encuentras algún problema o tienes sugerencias, por favor abre un issue en el repositorio.

---

**Última actualización:** 2025-11-08
