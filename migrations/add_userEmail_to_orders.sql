-- =============================================
-- Migración: Agregar campo userEmail a tabla orders
-- Fecha: 2025-10-24
-- Descripción: Agrega el campo userEmail para poder enviar
--              notificaciones cuando las canciones estén listas
-- =============================================

-- Agregar columna userEmail a la tabla orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS "userEmail" VARCHAR(255);

-- Comentario sobre la columna
COMMENT ON COLUMN orders."userEmail" IS 'Email del usuario para enviar notificaciones cuando las canciones estén listas';

-- Opcional: Actualizar órdenes existentes con el email del usuario
-- UPDATE orders o
-- SET "userEmail" = u.email
-- FROM users u
-- WHERE o."userId" = u.id
-- AND o."userEmail" IS NULL;

-- Verificar que se agregó correctamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'userEmail';
