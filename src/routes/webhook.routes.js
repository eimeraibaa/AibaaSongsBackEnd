import 'dotenv/config';
import { Router } from 'express';
import { handleStripeWebhook, handleSunoWebhook } from '../controllers/webhook.controller.js';

const router = Router();

/**
 * Endpoint de Webhook de Stripe
 * IMPORTANTE: NO aplicar middleware de autenticación aquí
 * IMPORTANTE: Debe recibir el body como raw bytes (configurado en app.js)
 */
router.post('/stripe', handleStripeWebhook);

/**
 * Endpoint de Webhook de Suno
 * Recibe notificaciones cuando las canciones están listas
 * IMPORTANTE: NO aplicar middleware de autenticación aquí
 * IMPORTANTE: Este endpoint usa JSON parser normal (no raw)
 */
router.post('/suno', handleSunoWebhook);

export default router;
