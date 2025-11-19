# Instrucciones para Ejecutar Migración de Password Reset

## Problema
El error que encontraste indica que las columnas `resetToken` y `resetTokenExpires` no existen en la tabla `users` de la base de datos.

## Solución

He creado una migración SQL y un script para agregar estas columnas. Debes ejecutar la migración en tu entorno de producción.

### Opción 1: Ejecutar el script de migración (Recomendado)

En tu servidor de producción o donde tengas acceso a la base de datos, ejecuta:

```bash
npm run migrate:password-reset
```

Este comando ejecutará el script `scripts/add-password-reset-fields.js` que:
- Agregará las columnas `resetToken` y `resetTokenExpires` a la tabla `users`
- Creará un índice para optimizar las búsquedas por token
- Agregará comentarios de documentación a las columnas

### Opción 2: Ejecutar el SQL manualmente

Si prefieres ejecutar el SQL manualmente, conéctate a tu base de datos PostgreSQL y ejecuta:

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

### Opción 3: Usar Railway CLI (si estás en Railway)

```bash
# Conectarse a la base de datos de Railway
railway connect postgres

# Luego ejecutar el SQL de la Opción 2
```

## Verificación

Después de ejecutar la migración, puedes verificar que las columnas se agregaron correctamente:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('resetToken', 'resetTokenExpires');
```

Deberías ver algo como:

```
  column_name      |          data_type
-------------------+-----------------------------
 resetToken        | character varying
 resetTokenExpires | timestamp with time zone
```

## Reiniciar la aplicación

Después de ejecutar la migración, reinicia tu aplicación para que los cambios surtan efecto:

```bash
# Si estás usando Railway
railway restart

# Si estás usando PM2
pm2 restart all

# Si estás usando Docker
docker-compose restart
```

## Archivos Relacionados

- **Migración SQL**: `migrations/add_password_reset_fields.sql`
- **Script de migración**: `scripts/add-password-reset-fields.js`
- **Modelo actualizado**: `src/models/users.js`

## Notas Importantes

- La migración usa `ADD COLUMN IF NOT EXISTS`, por lo que es seguro ejecutarla múltiples veces
- Si ya ejecutaste la migración, no causará errores al volver a ejecutarla
- Los tokens de reset expiran en 1 hora por seguridad
