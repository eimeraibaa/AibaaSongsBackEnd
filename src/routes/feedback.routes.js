import { Router } from 'express';
import { createFeedback, getSongFeedback } from '../controllers/feedback.controller.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = Router();

// Crear feedback (público)
router.post('/', createFeedback);

// Obtener feedbacks por songId (propietario únicamente)
router.get('/:songId', isAuthenticated, getSongFeedback);

export default router;
