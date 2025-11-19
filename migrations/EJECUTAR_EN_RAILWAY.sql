-- ========================================
-- COPIAR Y PEGAR ESTE SQL EN RAILWAY
-- ========================================

-- Agregar columnas para password reset
ALTER TABLE users ADD COLUMN IF NOT EXISTS "resetToken" VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "resetTokenExpires" TIMESTAMP WITH TIME ZONE;

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users("resetToken");

-- ========================================
-- VERIFICAR QUE FUNCIONÓ
-- ========================================
-- Después de ejecutar lo de arriba, ejecuta esto para verificar:

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('resetToken', 'resetTokenExpires');

-- Deberías ver 2 filas con las columnas nuevas
