// =============================================
// CONTROLADOR DE STRIPE WEBHOOK
// Maneja el flujo completo de pago a generación de canciones
// =============================================

import Stripe from 'stripe';
import { storage } from '../services/storage.js';
import { SunoService } from '../services/sunoService.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2020-08-27',
});

const sunoService = new SunoService();

/**
 * Webhook de Stripe para procesar eventos de pago
 * Este endpoint NO requiere autenticación porque viene directamente de Stripe
 * La seguridad se valida mediante la firma del webhook
 */
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // El body viene como Buffer desde express.raw()
    const rawBody = req.body;

    // Verificar la firma del webhook de Stripe
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      // En desarrollo, si no hay webhook secret, parsear el evento manualmente
      event = JSON.parse(rawBody.toString());
      console.warn('⚠️ No se configuró STRIPE_WEBHOOK_SECRET - solo para desarrollo');
    }

    console.log('📨 Webhook recibido:', event.type);

    // Manejar el evento según su tipo
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`ℹ️ Evento no manejado: ${event.type}`);
    }

    // Responder a Stripe que el webhook fue recibido
    res.json({ received: true });

  } catch (err) {
    console.error('❌ Error procesando webhook:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

/**
 * Procesa un pago exitoso
 * 1. Obtiene los items del cart desde metadata
 * 2. Crea la orden (Order)
 * 3. Crea los order items con las letras del cart
 * 4. Limpia el cart del usuario
 * 5. Dispara la generación de canciones con Suno
 */
async function handlePaymentSuccess(paymentIntent) {
  try {
    console.log('✅ Pago exitoso:', paymentIntent.id);

    // Extraer metadata del PaymentIntent
    const { userId, cartItemIds, type } = paymentIntent.metadata;

    if (type !== 'cart_checkout') {
      console.log('ℹ️ PaymentIntent no es de cart checkout, ignorando');
      return;
    }

    if (!userId || !cartItemIds) {
      console.error('❌ Metadata incompleta en PaymentIntent:', paymentIntent.metadata);
      return;
    }

    // Parsear los IDs del cart
    const itemIds = cartItemIds.split(',').map(id => parseInt(id, 10));

    // 1. Obtener items del cart con sus letras
    console.log('📦 Obteniendo items del cart:', itemIds);
    const cartItems = [];
    for (const itemId of itemIds) {
      const item = await storage.getCartItemById(itemId);
      if (item) {
        cartItems.push(item);
      }
    }

    if (cartItems.length === 0) {
      console.error('❌ No se encontraron items del cart');
      return;
    }

    // 2. Crear la orden (Order)
    const totalAmount = cartItems.reduce((sum, item) => {
      const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
      return sum + price;
    }, 0);

    console.log('📝 Creando orden...');
    const order = await storage.createOrder({
      userId: parseInt(userId, 10),
      stripePaymentIntentId: paymentIntent.id,
      totalAmount,
      status: 'completed',
    });

    console.log('✅ Orden creada:', order.id);

    // 3. Crear OrderItems con las letras del cart
    console.log('📝 Creando order items...');
    const orderItemPromises = cartItems.map(cartItem => {
      return storage.createOrderItem({
        orderId: order.id,
        dedicatedTo: cartItem.dedicatedTo,
        prompt: cartItem.prompt,
        genres: cartItem.genres,
        lyrics: cartItem.lyrics, // 🔑 CRÍTICO: Copiar las letras del cart
        price: cartItem.price,
        status: 'processing',
      });
    });

    const orderItems = await Promise.all(orderItemPromises);
    console.log('✅ Order items creados:', orderItems.length);

    // 4. Limpiar el cart del usuario
    console.log('🧹 Limpiando cart del usuario...');
    await storage.clearCart(parseInt(userId, 10));

    // 5. Disparar generación de canciones con Suno (asíncrono)
    console.log('🎵 Iniciando generación de canciones con Suno...');

    // Ejecutar en background sin bloquear la respuesta del webhook
    setImmediate(() => {
      generateSongsForOrder(order.id).catch(error => {
        console.error('❌ Error en generación de canciones:', error);
      });
    });

    console.log('✅ Proceso de pago completado exitosamente');

  } catch (error) {
    console.error('❌ Error procesando pago exitoso:', error);
    console.error('Stack:', error.stack);
    // No lanzamos el error para no fallar el webhook de Stripe
  }
}

/**
 * Genera canciones para una orden usando Suno AI
 * Esta función se ejecuta en background
 */
async function generateSongsForOrder(orderId) {
  try {
    console.log('🎵 Generando canciones para orden:', orderId);

    // Obtener order items con letras
    const orderItems = await storage.getOrderItemsWithLyrics(orderId);

    if (orderItems.length === 0) {
      console.error('❌ No hay items con letras para generar');
      return;
    }

    console.log(`📊 ${orderItems.length} items para generar`);

    // Generar cada canción
    for (const item of orderItems) {
      try {
        console.log(`🎵 Generando canción para item ${item.id}...`);

        // Llamar a Suno AI
        const sunoResult = await sunoService.generateSong(
          item.lyrics,
          item.genres[0] || 'pop',
          item.dedicatedTo || 'Canción Personalizada'
        );

        // Crear registro de canción
        const song = await storage.createSong(item.id, {
          title: item.dedicatedTo || 'Canción Personalizada',
          lyrics: item.lyrics,
          audioUrl: null, // Se actualizará cuando esté listo
          sunoSongId: sunoResult.songIds[0],
          genre: item.genres[0] || 'pop',
        });

        console.log(`✅ Canción creada con ID: ${song.id}, Suno ID: ${sunoResult.songIds[0]}`);

        // Esperar a que Suno complete la generación (en background)
        waitForSongCompletion(song.id, sunoResult.songIds);

      } catch (error) {
        console.error(`❌ Error generando canción para item ${item.id}:`, error);
        // Continuar con los demás items aunque falle uno
      }
    }

    console.log('✅ Proceso de generación iniciado para todos los items');

  } catch (error) {
    console.error('❌ Error en generateSongsForOrder:', error);
    throw error;
  }
}

/**
 * Espera a que Suno complete la generación y actualiza la DB
 * Se ejecuta en background para no bloquear
 */
async function waitForSongCompletion(songId, sunoSongIds) {
  try {
    console.log(`🔄 Esperando completitud de canción ${songId}...`);

    // Esperar a que Suno complete (máximo 5 minutos)
    const completedSongs = await sunoService.waitForCompletion(sunoSongIds);

    // Actualizar con la URL del audio
    if (completedSongs[0]?.audio_url) {
      await storage.updateSongStatus(
        songId,
        'completed',
        completedSongs[0].audio_url
      );

      console.log(`✅ Canción ${songId} completada con audio URL`);
    } else {
      console.error(`❌ Canción ${songId} completada sin audio URL`);
      await storage.updateSongStatus(songId, 'failed');
    }

  } catch (error) {
    console.error(`❌ Error esperando completitud de canción ${songId}:`, error);
    await storage.updateSongStatus(songId, 'failed');
  }
}

/**
 * Procesa un pago fallido
 */
async function handlePaymentFailed(paymentIntent) {
  try {
    console.log('❌ Pago fallido:', paymentIntent.id);

    // Aquí podrías notificar al usuario o realizar otras acciones
    // Por ahora solo logueamos

  } catch (error) {
    console.error('❌ Error procesando pago fallido:', error);
  }
}
