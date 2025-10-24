import 'dotenv/config';
import { Router } from 'express';
import {
  generateSongsFromOrder,
  getSong,
  getUserSongs,
  downloadSong,
  streamSong
} from '../controllers/song.controller.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = Router();

// =============================================
// RUTAS DE GENERACIÓN DE CANCIONES
// =============================================

/**
 * POST /song/generateSongsFromOrder/:orderId
 * Genera canciones manualmente para una orden
 * Requiere autenticación
 */
router.post('/generateSongsFromOrder/:orderId', isAuthenticated, generateSongsFromOrder);

// =============================================
// RUTAS DE CONSULTA DE CANCIONES
// =============================================

/**
 * GET /song/user
 * Lista todas las canciones del usuario autenticado
 * Requiere autenticación
 */
router.get('/user', isAuthenticated, getUserSongs);

/**
 * GET /song/:id
 * Obtiene información de una canción específica
 * Requiere autenticación
 */
router.get('/:id', isAuthenticated, getSong);

/**
 * GET /song/:id/stream
 * Obtiene la URL de streaming de una canción
 * Requiere autenticación
 */
router.get('/:id/stream', isAuthenticated, streamSong);

/**
 * GET /song/:id/download
 * Descarga el archivo de audio de una canción
 * Requiere autenticación
 */
router.get('/:id/download', isAuthenticated, downloadSong);

export default router;