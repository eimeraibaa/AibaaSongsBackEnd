/**
 * Pricing Routes
 * Rutas para obtener configuración de precios
 */

import { Router } from 'express';
import {
  getPricingConfig,
  calculateCartTotal
} from '../controllers/pricing.controller.js';

const router = Router();

/**
 * GET /api/pricing/config
 * Obtiene configuración de precios (público)
 */
router.get('/config', getPricingConfig);

/**
 * POST /api/pricing/calculate
 * Calcula total del carrito (público)
 */
router.post('/calculate', calculateCartTotal);

export default router;
