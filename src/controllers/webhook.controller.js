// =============================================
// CONTROLADOR DE STRIPE WEBHOOK
// Maneja el flujo completo de pago a generación de canciones
// =============================================

import Stripe from 'stripe';
import { storage } from '../services/storage.js';
import { SunoService } from '../services/sunoService.js';
import { emailService } from '../services/emailService.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2020-08-27',
});

const sunoService = new SunoService();

// CallbackUrl de Suno (opcional)
// Si está configurado, Suno enviará notificaciones cuando las canciones estén listas
// Formato: https://tu-dominio.com/webhook/suno
const SUNO_CALLBACK_URL = process.env.SUNO_CALLBACK_URL || '';

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

    // 2. Obtener email del usuario
    const user = await storage.getUser(parseInt(userId, 10));
    const userEmail = user?.email || null;

    if (!userEmail) {
      console.warn('⚠️ No se pudo obtener el email del usuario');
    }

    // 3. Crear la orden (Order)
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
      userEmail,
    });

    console.log('✅ Orden creada:', order.id);

    // 4. Crear OrderItems con las letras del cart
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

    // 5. Limpiar el cart del usuario
    console.log('🧹 Limpiando cart del usuario...');
    await storage.clearCart(parseInt(userId, 10));

    // 6. Disparar generación de canciones con Suno (asíncrono)
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

    // Array para rastrear las promesas de completitud
    const completionPromises = [];

    // Generar cada canción
    for (const item of orderItems) {
      try {
        console.log(`🎵 Generando canción para item ${item.id}...`);

        // Llamar a Suno AI con callbackUrl si está configurado
        const sunoResult = await sunoService.generateSong(
          item.lyrics,
          item.genres[0] || 'pop',
          item.dedicatedTo || 'Canción Personalizada',
          SUNO_CALLBACK_URL // Pasar el callbackUrl
        );

        if (SUNO_CALLBACK_URL) {
          console.log(`🔗 Generación con callbackUrl: ${SUNO_CALLBACK_URL}`);
        } else {
          console.log(`📊 Generación sin callbackUrl, usando polling`);
        }

        // Crear registro de canción
        const song = await storage.createSong(item.id, {
          title: item.dedicatedTo || 'Canción Personalizada',
          lyrics: item.lyrics,
          audioUrl: null, // Se actualizará cuando esté listo
          sunoSongId: sunoResult.songIds[0], // Puede ser taskId si usa webhook
          genre: item.genres[0] || 'pop',
        });

        console.log(`✅ Canción creada con ID: ${song.id}, Suno ID: ${sunoResult.songIds[0]}`);

        // Solo usar polling si NO hay callbackUrl configurado Y NO se usa webhook
        if (!SUNO_CALLBACK_URL && !sunoResult.useWebhook) {
          console.log(`🔄 Iniciando polling para canción ${song.id}...`);
          const completionPromise = waitForSongCompletion(song.id, sunoResult.songIds);
          completionPromises.push(completionPromise);
        } else {
          console.log(`✅ Canción ${song.id} esperará notificación por webhook (no polling)`);
          if (sunoResult.taskId) {
            console.log(`📋 TaskId de Suno: ${sunoResult.taskId}`);
          }
        }

      } catch (error) {
        console.error(`❌ Error generando canción para item ${item.id}:`, error);
        // Continuar con los demás items aunque falle uno
      }
    }

    console.log('✅ Proceso de generación iniciado para todos los items');

    // Solo esperar y notificar si estamos usando polling (sin callbackUrl)
    if (!SUNO_CALLBACK_URL && completionPromises.length > 0) {
      console.log(`📧 Esperando completitud de ${completionPromises.length} canciones para notificar...`);
      notifyWhenAllSongsReady(orderId, completionPromises);
    } else if (SUNO_CALLBACK_URL) {
      console.log(`✅ Notificación será manejada por webhook de Suno`);
    }

  } catch (error) {
    console.error('❌ Error en generateSongsForOrder:', error);
    throw error;
  }
}

/**
 * Espera a que Suno complete la generación y actualiza la DB
 * Se ejecuta en background para no bloquear
 * @returns {Promise} Promesa que se resuelve cuando la canción está lista
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
      return { success: true, songId };
    } else {
      console.error(`❌ Canción ${songId} completada sin audio URL`);
      await storage.updateSongStatus(songId, 'failed');
      return { success: false, songId, error: 'No audio URL' };
    }

  } catch (error) {
    console.error(`❌ Error esperando completitud de canción ${songId}:`, error);
    await storage.updateSongStatus(songId, 'failed');
    return { success: false, songId, error: error.message };
  }
}

/**
 * Notifica al usuario cuando todas las canciones están listas
 * @param {number} orderId - ID de la orden
 * @param {Array<Promise>} completionPromises - Array de promesas de completitud
 */
async function notifyWhenAllSongsReady(orderId, completionPromises) {
  try {
    console.log(`📧 Esperando que todas las canciones de la orden ${orderId} estén listas...`);

    // Esperar a que todas las canciones estén completadas
    const results = await Promise.allSettled(completionPromises);

    // Contar canciones exitosas y fallidas
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));

    console.log(`✅ ${successful.length} canciones completadas, ${failed.length} fallidas`);

    // Obtener la orden con el email
    const order = await storage.getOrderById(orderId);

    if (!order || !order.userEmail) {
      console.warn(`⚠️ No se puede enviar email: orden ${orderId} sin email`);
      return;
    }

    // Obtener las canciones completadas
    const songs = await storage.getOrderSongs(orderId);
    const completedSongs = songs.filter(song => song.status === 'completed');

    if (completedSongs.length === 0) {
      console.warn(`⚠️ No hay canciones completadas para notificar en orden ${orderId}`);

      // Si hay canciones fallidas, enviar email de error
      if (failed.length > 0) {
        const failedSongs = songs
          .filter(song => song.status === 'failed')
          .map(song => ({
            title: song.title,
            error: 'Error en la generación'
          }));

        await emailService.sendGenerationFailedEmail(
          order.userEmail,
          orderId,
          failedSongs
        );
      }

      return;
    }

    // Enviar email con las canciones listas
    console.log(`📧 Enviando email a ${order.userEmail} con ${completedSongs.length} canciones`);

    const emailResult = await emailService.sendSongsReadyEmail(
      order.userEmail,
      completedSongs,
      orderId
    );

    if (emailResult.success) {
      console.log(`✅ Email enviado exitosamente a ${order.userEmail}`);
      if (emailResult.previewUrl) {
        console.log(`📧 Preview URL: ${emailResult.previewUrl}`);
      }
    } else {
      console.error(`❌ Error enviando email: ${emailResult.error}`);
    }

  } catch (error) {
    console.error(`❌ Error notificando usuario de orden ${orderId}:`, error);
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

/**
 * Webhook de Suno para recibir notificaciones cuando las canciones están listas
 * Este endpoint se configura en el callbackUrl de Suno
 * POST /webhook/suno
 */
export const handleSunoWebhook = async (req, res) => {
  try {
    console.log('========================================');
    console.log('📨 WEBHOOK DE SUNO RECIBIDO');
    console.log('========================================');

    // LOG COMPLETO DEL BODY para debugging
    console.log('📋 Body completo del webhook:');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('========================================');

    const { taskId, callbackType, status, data } = req.body;

    console.log('📊 Datos extraídos:', {
      taskId,
      callbackType,
      status,
      dataLength: data?.length || 0
    });

    // Verificar que el webhook sea exitoso
    if (!status || status.code !== 200) {
      console.error('❌ Webhook de Suno con error:', status);
      return res.status(200).json({ received: true }); // Responder OK de todas formas
    }

    // Verificar que haya datos
    if (!data || data.length === 0) {
      console.warn('⚠️ Webhook de Suno sin datos');
      return res.status(200).json({ received: true });
    }

    // Procesar cada canción en el callback
    for (const songData of data) {
      try {
        const { id: sunoSongId, audio_url, image_url, title, duration, tags } = songData;

        console.log(`🎵 Procesando canción de Suno: ${sunoSongId}`);
        console.log(`📋 TaskId del webhook: ${taskId}`);

        // Buscar la canción en nuestra base de datos
        // IMPORTANTE: Cuando se usa webhook, guardamos el taskId temporalmente en sunoSongId
        // Así que primero intentamos buscar por el taskId
        let song = await storage.getSongBySunoId(taskId);

        // Si no se encuentra por taskId, intentar buscar por el sunoSongId real
        if (!song) {
          console.log(`⚠️ No se encontró canción con taskId: ${taskId}, buscando por sunoSongId: ${sunoSongId}`);
          song = await storage.getSongBySunoId(sunoSongId);
        }

        if (!song) {
          console.warn(`⚠️ Canción no encontrada en BD. TaskId: ${taskId}, SunoSongId: ${sunoSongId}`);
          continue;
        }

        console.log(`✅ Canción encontrada en BD: ID ${song.id}`);

        // Actualizar la canción con la URL del audio
        if (audio_url) {
          await storage.updateSongStatus(song.id, 'completed', audio_url);

          // Actualizar el sunoSongId con el ID real si era un taskId temporal
          if (song.sunoSongId === taskId && taskId !== sunoSongId) {
            console.log(`🔄 Actualizando sunoSongId de taskId temporal (${taskId}) a ID real (${sunoSongId})`);
            await storage.updateSongSunoId(song.id, sunoSongId);
          }

          // Actualizar también la imagen si viene
          if (image_url && song.imageUrl !== image_url) {
            await storage.updateSongImage(song.id, image_url);
          }

          console.log(`✅ Canción ${song.id} actualizada con audio URL desde webhook de Suno`);

          // Verificar si todas las canciones de la orden están listas
          const orderItem = await storage.getOrderItemById(song.orderItemId);
          if (orderItem) {
            checkAndNotifyOrderCompletion(orderItem.orderId);
          }
        } else {
          console.warn(`⚠️ Canción ${sunoSongId} sin audio_url`);
        }

      } catch (error) {
        console.error('❌ Error procesando canción del webhook:', error);
        console.error('Stack:', error.stack);
        // Continuar con las demás canciones
      }
    }

    // Responder a Suno que el webhook fue recibido
    res.json({ received: true, processed: data.length });

  } catch (error) {
    console.error('❌ Error procesando webhook de Suno:', error);
    return res.status(200).json({ received: true }); // Responder OK de todas formas para evitar reintentos
  }
};

/**
 * Verifica si todas las canciones de una orden están listas y envía notificación
 * @param {number} orderId - ID de la orden
 */
async function checkAndNotifyOrderCompletion(orderId) {
  try {
    console.log(`🔍 Verificando completitud de orden ${orderId}...`);

    // Obtener todas las canciones de la orden
    const songs = await storage.getOrderSongs(orderId);

    if (songs.length === 0) {
      console.warn(`⚠️ No hay canciones para la orden ${orderId}`);
      return;
    }

    // Verificar si todas están completadas o fallidas (ninguna en 'generating')
    const allFinished = songs.every(song =>
      song.status === 'completed' || song.status === 'failed'
    );

    if (!allFinished) {
      console.log(`🔄 Orden ${orderId} aún tiene canciones generándose`);
      return;
    }

    const completedSongs = songs.filter(song => song.status === 'completed');
    const failedSongs = songs.filter(song => song.status === 'failed');

    console.log(`📊 Orden ${orderId}: ${completedSongs.length} completadas, ${failedSongs.length} fallidas`);

    // Obtener la orden con el email
    const order = await storage.getOrderById(orderId);

    if (!order || !order.userEmail) {
      console.warn(`⚠️ Orden ${orderId} sin email, no se puede notificar`);
      return;
    }

    // Enviar email según el resultado
    if (completedSongs.length > 0) {
      console.log(`📧 Enviando email de canciones listas a ${order.userEmail}`);

      const emailResult = await emailService.sendSongsReadyEmail(
        order.userEmail,
        completedSongs,
        orderId
      );

      if (emailResult.success) {
        console.log(`✅ Email enviado exitosamente`);
        if (emailResult.previewUrl) {
          console.log(`📧 Preview: ${emailResult.previewUrl}`);
        }
      } else {
        console.error(`❌ Error enviando email: ${emailResult.error}`);
      }
    }

    // Si hay canciones fallidas, enviar email de error
    if (failedSongs.length > 0 && completedSongs.length === 0) {
      console.log(`📧 Enviando email de error a ${order.userEmail}`);

      await emailService.sendGenerationFailedEmail(
        order.userEmail,
        orderId,
        failedSongs.map(song => ({
          title: song.title,
          error: 'Error en la generación'
        }))
      );
    }

  } catch (error) {
    console.error(`❌ Error verificando completitud de orden ${orderId}:`, error);
  }
}
