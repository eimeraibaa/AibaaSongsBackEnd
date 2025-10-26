import 'dotenv/config';
import { Router } from 'express';
import {
  handleStripeWebhook,
  handleSunoWebhook,
  testEmailSend,
  checkSunoWebhookConfig,
  updateOrderEmail
} from '../controllers/webhook.controller.js';

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

/**
 * Endpoint de diagnóstico para verificar configuración del webhook de Suno
 * GET /webhook/suno-config
 * Verifica que todas las variables de entorno estén configuradas correctamente
 */
router.get('/suno-config', checkSunoWebhookConfig);

/**
 * Endpoint para actualizar el email de una orden
 * POST /webhook/update-order-email/:orderId
 * Body: { email: "usuario@example.com" } (opcional)
 */
router.post('/update-order-email/:orderId', updateOrderEmail);

/**
 * Endpoint de prueba para forzar el envío de correo
 * POST /webhook/test-email/:orderId
 * Envía el correo de canciones listas de una orden específica
 */
router.post('/test-email/:orderId', testEmailSend);

export default router;
