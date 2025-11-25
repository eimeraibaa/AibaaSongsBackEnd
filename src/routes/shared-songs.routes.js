import { Router } from 'express';
import { createSharedSong, getSharedSong } from '../controllers/sharedSongs.controller.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = Router();

// Crear enlace para compartir (usuario autenticado)
router.post('/create', isAuthenticated, createSharedSong);

// Obtener datos de canción compartida (público)
router.get('/:token', getSharedSong);

export default router;
