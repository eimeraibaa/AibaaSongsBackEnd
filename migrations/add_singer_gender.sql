-- =============================================
-- Migración: Agregar campo singerGender a tablas
-- Fecha: 2025-10-28
-- Descripción: Agrega el campo singerGender para especificar
--              el género de la voz del cantante (masculino/femenino)
-- =============================================

-- Agregar columna singerGender a cart_items
ALTER TABLE cart_items
ADD COLUMN IF NOT EXISTS "singerGender" VARCHAR(10) DEFAULT 'male';

-- Agregar columna singerGender a order_items
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS "singerGender" VARCHAR(10) DEFAULT 'male';

-- Agregar columna singerGender a song_requests (opcional)
ALTER TABLE song_requests
ADD COLUMN IF NOT EXISTS "singerGender" VARCHAR(10) DEFAULT 'male';

-- Comentarios sobre las columnas
COMMENT ON COLUMN cart_items."singerGender" IS 'Género de la voz del cantante: male (masculino) o female (femenino)';
COMMENT ON COLUMN order_items."singerGender" IS 'Género de la voz del cantante: male (masculino) o female (femenino)';
COMMENT ON COLUMN song_requests."singerGender" IS 'Género de la voz del cantante: male (masculino) o female (femenino)';

-- Verificar que se agregaron correctamente
SELECT
    table_name,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('cart_items', 'order_items', 'song_requests')
AND column_name = 'singerGender'
ORDER BY table_name;

-- Opcional: Agregar constraint para validar valores
ALTER TABLE cart_items
ADD CONSTRAINT check_cart_items_singer_gender
CHECK ("singerGender" IN ('male', 'female'));

ALTER TABLE order_items
ADD CONSTRAINT check_order_items_singer_gender
CHECK ("singerGender" IN ('male', 'female'));

ALTER TABLE song_requests
ADD CONSTRAINT check_song_requests_singer_gender
CHECK ("singerGender" IN ('male', 'female'));
