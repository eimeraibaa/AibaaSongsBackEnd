-- =============================================
-- Migración: Crear tabla shared_songs
-- Fecha: 2025-11-24
-- Descripción: Tabla para almacenar enlaces únicos para compartir canciones
-- =============================================

CREATE TABLE IF NOT EXISTS shared_songs (
  id SERIAL PRIMARY KEY,
  songId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  shareToken VARCHAR(128) NOT NULL UNIQUE,
  title VARCHAR(255),
  message TEXT,
  viewCount INTEGER NOT NULL DEFAULT 0,
  feedbackCount INTEGER NOT NULL DEFAULT 0,
  isActive BOOLEAN NOT NULL DEFAULT true,
  expiresAt TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_songs_songId ON shared_songs (songId);
CREATE INDEX IF NOT EXISTS idx_shared_songs_userId ON shared_songs (userId);
