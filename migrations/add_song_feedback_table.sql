-- =============================================
-- Migración: Crear tabla song_feedback
-- Fecha: 2025-11-24
-- Descripción: Tabla para almacenar opiniones / feedback sobre canciones
-- =============================================

CREATE TABLE IF NOT EXISTS song_feedback (
  id SERIAL PRIMARY KEY,
  songId INTEGER NOT NULL,
  shareToken VARCHAR(128),
  name VARCHAR(255),
  email VARCHAR(255),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_song_feedback_songId ON song_feedback (songId);
CREATE INDEX IF NOT EXISTS idx_song_feedback_shareToken ON song_feedback (shareToken);
