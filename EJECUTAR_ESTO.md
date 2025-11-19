# EJECUTA ESTO PARA ARREGLAR EL PROBLEMA

## Paso 1: Obtén la URL de la base de datos de Railway

1. Ve a https://railway.app
2. Abre tu proyecto
3. Haz click en el servicio **PostgreSQL**
4. Ve a **"Variables"** o **"Connect"**
5. **COPIA** el valor completo de **DATABASE_URL**

   Debe verse algo así:
   ```
   postgresql://postgres:contraseña123@monorail.proxy.rlwy.net:12345/railway
   ```

## Paso 2: Ejecuta la migración desde tu PowerShell

En tu PowerShell (donde estás ahora), ejecuta estos 2 comandos:

```powershell
# Pega aquí la DATABASE_URL que copiaste (reemplaza todo lo que está entre las comillas)
$env:RAILWAY_DATABASE_URL="postgresql://postgres:tu-password@host.railway.app:puerto/railway"

# Ejecuta la migración
npm run migrate:railway
```

### Ejemplo completo:

```powershell
$env:RAILWAY_DATABASE_URL="postgresql://postgres:abc123xyz@monorail.proxy.rlwy.net:54321/railway"
npm run migrate:railway
```

## Paso 3: Verifica el resultado

Deberías ver:

```
🚀 Conectando a Railway...
✅ Conectado a Railway exitosamente
🔄 Ejecutando migración...
✅ Migración completada en Railway!
🔍 Verificando columnas...
✅ Columnas verificadas:
   - resetToken: character varying
   - resetTokenExpires: timestamp with time zone

🎉 ¡TODO LISTO! Ahora puedes usar la funcionalidad de password reset
```

## Paso 4: Prueba que funcione

Reinicia tu servicio en Railway y prueba:

```bash
POST https://tu-backend.railway.app/users/forgot-password
Content-Type: application/json

{
  "email": "tu@email.com",
  "language": "es"
}
```

---

## ⚠️ IMPORTANTE

- **TUS DATOS NO SE BORRARÁN** - Esta migración solo agrega 2 columnas nuevas
- **Es seguro ejecutar varias veces** - Usa `IF NOT EXISTS`
- **Se ejecuta directamente en Railway** - No afecta tu base de datos local

---

## Si tienes problemas

Si ves un error de conexión, verifica que:
1. Copiaste la DATABASE_URL **completa** (sin espacios al inicio/final)
2. Incluiste las comillas en el comando de PowerShell
3. La URL empieza con `postgresql://`

---

## ¿Por qué funcionará ahora?

Antes ejecutabas `npm run migrate:password-reset` que se conectaba a tu base de datos **local**.

Ahora ejecutarás `npm run migrate:railway` que se conecta a tu base de datos de **Railway** usando la URL que pegaste.
