# Instrucciones para Ejecutar Migración en Railway

## El problema
La migración se ejecutó localmente contra tu base de datos local, no contra Railway.

## Solución 1: SQL Directo en Railway Dashboard (Recomendado - 2 minutos)

1. Ve a https://railway.app y abre tu proyecto
2. Haz clic en el servicio **PostgreSQL** (base de datos)
3. Ve a la pestaña **"Data"**
4. Haz clic en **"Query"** o busca el editor SQL
5. Copia y pega este SQL completo:

```sql
-- Add new columns for password reset
ALTER TABLE users
ADD COLUMN IF NOT EXISTS "resetToken" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "resetTokenExpires" TIMESTAMP WITH TIME ZONE;

-- Create index for better performance on token lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users("resetToken");

-- Add comments for documentation
COMMENT ON COLUMN users."resetToken" IS 'Token for password reset, valid for 1 hour';
COMMENT ON COLUMN users."resetTokenExpires" IS 'Expiration timestamp for reset token';
```

6. Presiona **"Execute"** o **"Run"**
7. Verifica que las columnas se crearon ejecutando:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('resetToken', 'resetTokenExpires');
```

Deberías ver:

```
  column_name      |          data_type
-------------------+-----------------------------
 resetToken        | character varying
 resetTokenExpires | timestamp with time zone
```

## Solución 2: Railway CLI (Si prefieres terminal)

```bash
# Instalar Railway CLI (si no la tienes)
npm i -g @railway/cli

# Login a Railway
railway login

# Vincular al proyecto
railway link

# Conectar a la base de datos
railway connect postgres

# Ahora ejecuta el SQL de la Solución 1
```

## Solución 3: Ejecutar migración en el servicio de Railway

Si tienes Railway CLI instalado:

```bash
# Ejecutar comando en el servicio de backend
railway run npm run migrate:password-reset
```

Esto ejecutará la migración en el entorno de Railway con las variables de entorno correctas.

## Verificar que funcionó

Después de ejecutar la migración, prueba el endpoint:

```bash
curl -X POST https://tu-backend.railway.app/users/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "tu@email.com", "language": "es"}'
```

Si funciona, deberías recibir:
```json
{
  "message": "Si el email existe, recibirás instrucciones para restablecer tu contraseña"
}
```

Y el usuario debería recibir un email.

## Reiniciar el servicio (opcional)

Después de la migración, es buena idea reiniciar:

```bash
railway restart
```

O desde el dashboard de Railway: Click en tu servicio → Settings → Restart
