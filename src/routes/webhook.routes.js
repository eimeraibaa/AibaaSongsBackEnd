import 'dotenv/config';
import { Router } from 'express';
import { handleStripeWebhook } from '../controllers/webhook.controller.js';

const router = Router();

/**
 * Endpoint de Webhook de Stripe
 * IMPORTANTE: NO aplicar middleware de autenticación aquí
 * IMPORTANTE: Debe recibir el body como raw bytes (configurado en app.js)
 */
router.post('/stripe', handleStripeWebhook);

export default router;
