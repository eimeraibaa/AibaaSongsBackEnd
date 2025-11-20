/**
 * Rutas para servir assets estáticos
 */

import { Router } from 'express';
import { serveLogo } from '../controllers/assets.controller.js';

const router = Router();

/**
 * GET /assets/logo
 * Sirve el logo de la aplicación
 */
router.get('/logo', serveLogo);

export default router;
