// =============================================
// CONTROLADOR DE STRIPE WEBHOOK
// Maneja el flujo completo de pago a generación de canciones
// =============================================

import Stripe from 'stripe';
import { storage } from '../services/storage.js';
import { SunoService } from '../services/sunoService.js';
import { resendEmailService as emailService } from '../services/resendEmailService.js';

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
        console.log(`📊 CartItem ${itemId}: language=${item.language || 'N/A'}`);
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
      console.log(`📝 Creando OrderItem para cartItem ${cartItem.id}: language=${cartItem.language || 'es'}`);
      return storage.createOrderItem({
        orderId: order.id,
        dedicatedTo: cartItem.dedicatedTo,
        prompt: cartItem.prompt,
        genres: cartItem.genres,
        lyrics: cartItem.lyrics, // 🔑 CRÍTICO: Copiar las letras del cart
        language: cartItem.language || 'es', // 🌐 Copiar el idioma detectado
        singerGender: cartItem.singerGender || 'male', // 🎤 Copiar el género del cantante
        price: cartItem.price,
        singerGender: cartItem.singerGender || null,
        status: 'processing',
      });
    });

    const orderItems = await Promise.all(orderItemPromises);
    console.log('✅ Order items creados:', orderItems.length);
    orderItems.forEach((item, i) => {
      console.log(`   ${i + 1}. OrderItem ID: ${item.id}, Language: ${item.language || 'N/A'}`);
    });

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
          SUNO_CALLBACK_URL, // Pasar el callbackUrl
          item.singerGender || 'male' // género del cantante
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
          language: item.language || 'es', // 🌐 Idioma de las letras
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

    // El formato real del webhook de Suno es:
    // {
    //   "code": 200,
    //   "msg": "...",
    //   "data": {
    //     "callbackType": "complete",
    //     "task_id": "...",
    //     "data": [...]
    //   }
    // }

    const webhookCode = req.body.code;
    const webhookMsg = req.body.msg;
    const webhookData = req.body.data;

    // Verificar que el webhook sea exitoso
    if (!webhookCode || webhookCode !== 200) {
      console.error('❌ Webhook de Suno con error:', { code: webhookCode, msg: webhookMsg });
      return res.status(200).json({ received: true }); // Responder OK de todas formas
    }

    // Verificar que haya datos
    if (!webhookData) {
      console.warn('⚠️ Webhook de Suno sin datos');
      return res.status(200).json({ received: true });
    }

    // Extraer los datos internos
    const { callbackType, task_id: taskId, data: songsData } = webhookData;

    console.log('📊 Datos extraídos:', {
      taskId,
      callbackType,
      webhookCode,
      webhookMsg,
      songsDataLength: songsData?.length || 0
    });

    // Verificar que haya canciones en los datos
    if (!songsData || songsData.length === 0) {
      console.warn('⚠️ Webhook de Suno sin canciones en data');
      return res.status(200).json({ received: true });
    }

    // Solo procesar si es el webhook final (complete)
    // Suno envía múltiples webhooks: "text" (sin audio) y "complete" (con audio)
    if (callbackType !== 'complete') {
      console.log(`ℹ️ Webhook con callbackType="${callbackType}" - esperando webhook "complete"`);
      return res.status(200).json({ received: true, waiting: 'complete' });
    }

    console.log('✅ Webhook "complete" recibido - procesando canciones...');
    console.log(`📊 Total canciones en webhook: ${songsData.length}`);

    // Buscar la canción base UNA VEZ antes del loop
    const baseSong = await storage.getSongBySunoId(taskId);

    if (!baseSong) {
      console.error(`❌ No se encontró canción base con taskId ${taskId}`);
      return res.status(200).json({ received: true, error: 'Song not found' });
    }

    console.log(`✅ Canción base encontrada: ID ${baseSong.id}, OrderItemId: ${baseSong.orderItemId}, Title: ${baseSong.title}`);

    // Track de canciones procesadas y órdenes afectadas
    let processedCount = 0;
    let variationsCreated = 0;
    const affectedOrders = new Set(); // Para rastrear qué órdenes fueron afectadas

    // Procesar cada canción en el callback
    for (let i = 0; i < songsData.length; i++) {
      try {
        const songData = songsData[i];
        const { id: sunoSongId, audio_url, image_url, title, duration, tags } = songData;
        const variationNumber = i + 1; // V1, V2, V3...

        console.log(`🎵 Procesando canción ${variationNumber}/${songsData.length} de Suno: ${sunoSongId}`);

        // Si es la primera variación (i=0), actualizar la canción existente
        // Si es una variación adicional (i>0), crear una nueva Song
        let song;
        if (i > 0) {
          console.log(`🎵 Creando variación ${variationNumber} de la canción`);

          // Verificar que haya audio_url
          if (!audio_url || audio_url.trim() === '') {
            console.warn(`⚠️ Variación ${variationNumber} sin audio_url - omitiendo`);
            continue;
          }

          // Crear nueva canción como variación
          song = await storage.createSong(baseSong.orderItemId, {
            title: `${baseSong.title.replace(/\s*\(V\d+\)/, '')} (V${variationNumber})`,
            lyrics: baseSong.lyrics,
            audioUrl: audio_url,
            imageUrl: image_url,
            sunoSongId: sunoSongId, // Guardar el ID específico de esta variación
            genre: baseSong.genre,
            language: baseSong.language || 'es', // 🌐 Copiar el idioma de la canción base
            variation: variationNumber
          });

          // Actualizar estado a completado
          await storage.updateSongStatus(song.id, 'completed', audio_url);
          variationsCreated++;
          console.log(`✅ Variación ${variationNumber} creada: ID ${song.id}`);
        } else {
          // Primera variación: actualizar la canción existente
          console.log(`🔄 Actualizando canción original (V1)`);

          // Actualizar URLs en order_items para la primera variación
          console.log(`🔄 Actualizando previewUrl y finalUrl en order_item ${baseSong.orderItemId}`);
          await storage.updateOrderItemUrls(baseSong.orderItemId, {
            previewUrl: image_url || null,
            finalUrl: audio_url || null
          });
          console.log(`✅ URLs actualizados en order_item ${baseSong.orderItemId}`);

          // Verificar que haya audio_url
          if (!audio_url || audio_url.trim() === '') {
            console.warn(`⚠️ Canción ${sunoSongId} sin audio_url - omitiendo actualización`);
            continue;
          }

          // Actualizar título con V1
          if (!baseSong.title.includes('(V1)')) {
            await storage.updateSongTitle(baseSong.id, `${baseSong.title} (V1)`);
          }

          // Actualizar la canción con la URL del audio
          await storage.updateSongStatus(baseSong.id, 'completed', audio_url);

          // Actualizar también la imagen si viene
          if (image_url && baseSong.imageUrl !== image_url) {
            await storage.updateSongImage(baseSong.id, image_url);
          }

          // Actualizar el sunoSongId específico
          if (baseSong.sunoSongId !== sunoSongId) {
            await storage.updateSongSunoId(baseSong.id, sunoSongId);
          }

          console.log(`✅ Canción V1 actualizada: ID ${baseSong.id}`);
          song = baseSong;
        }

        processedCount++;

        // Rastrear la orden afectada para notificar al final
        affectedOrders.add(baseSong.orderItemId ?
          (await storage.getOrderItemById(baseSong.orderItemId))?.orderId : null);

      } catch (error) {
        console.error('❌ Error procesando canción del webhook:', error);
        console.error('Stack:', error.stack);
        // Continuar con las demás canciones
      }
    }

    // Notificar las órdenes afectadas SOLO UNA VEZ al final
    console.log(`📧 Verificando ${affectedOrders.size} orden(es) afectada(s)...`);
    for (const orderId of affectedOrders) {
      await checkAndNotifyOrderCompletion(orderId);
    }

    // Log de resumen
    console.log('========================================');
    console.log('📊 RESUMEN DEL PROCESAMIENTO:');
    console.log(`✅ Canciones procesadas: ${processedCount}`);
    console.log(`🎵 Variaciones creadas: ${variationsCreated}`);
    console.log('========================================');

    // Responder a Suno que el webhook fue recibido
    res.json({ received: true, processed: processedCount, variationsCreated });

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
    console.log('========================================');
    console.log(`🔍 Verificando completitud de orden ${orderId}...`);
    console.log('========================================');

    // Obtener todas las canciones de la orden
    const songs = await storage.getOrderSongs(orderId);

    console.log(`📊 Total canciones en orden: ${songs.length}`);

    if (songs.length === 0) {
      console.warn(`⚠️ No hay canciones para la orden ${orderId}`);
      return;
    }

    // Log de estado de cada canción
    songs.forEach((song, index) => {
      console.log(`  ${index + 1}. Canción ID ${song.id} - Status: ${song.status} - Title: ${song.title || 'N/A'}`);
    });

    // Verificar si todas están completadas o fallidas (ninguna en 'generating')
    const allFinished = songs.every(song =>
      song.status === 'completed' || song.status === 'failed'
    );

    if (!allFinished) {
      console.log(`🔄 Orden ${orderId} aún tiene canciones generándose`);
      const pending = songs.filter(s => s.status === 'generating');
      console.log(`⏳ Canciones pendientes: ${pending.length}`);
      return;
    }

    const completedSongs = songs.filter(song => song.status === 'completed');
    const failedSongs = songs.filter(song => song.status === 'failed');

    console.log(`📊 Orden ${orderId}: ${completedSongs.length} completadas, ${failedSongs.length} fallidas`);

    // Obtener la orden con el email
    const order = await storage.getOrderById(orderId);

    if (!order) {
      console.error(`❌ Orden ${orderId} no encontrada`);
      return;
    }

    console.log(`📧 Email del usuario: ${order.userEmail || 'N/A'}`);

    if (!order.userEmail) {
      console.warn(`⚠️ Orden ${orderId} sin email, no se puede notificar`);
      return;
    }

    // Enviar email según el resultado
    if (completedSongs.length > 0) {
      console.log('========================================');
      console.log(`📧 Enviando email de canciones listas a ${order.userEmail}`);
      console.log(`📊 ${completedSongs.length} canción(es) completada(s)`);
      console.log('========================================');

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

    console.log('========================================');
    console.log(`✅ Proceso de notificación completado para orden ${orderId}`);
    console.log('========================================');

  } catch (error) {
    console.error(`❌ Error verificando completitud de orden ${orderId}:`, error);
    console.error('Stack:', error.stack);
  }
}

/**
 * Endpoint para actualizar el email de una orden
 * POST /webhook/update-order-email/:orderId
 * Body: { email: "usuario@example.com" } (opcional, usa el del usuario si no se proporciona)
 */
export const updateOrderEmail = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { email } = req.body || {};

    console.log('========================================');
    console.log(`📧 Actualizando email de orden ${orderId}...`);
    console.log('========================================');

    // Obtener la orden
    const order = await storage.getOrderById(parseInt(orderId));

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden no encontrada'
      });
    }

    console.log(`📊 Orden encontrada: ID ${order.id}`);
    console.log(`📧 Email actual: ${order.userEmail || 'N/A'}`);

    // Determinar el email a usar
    let emailToUse = email;

    if (!emailToUse) {
      // Si no se proporcionó email, obtener del usuario
      const user = await storage.getUser(order.userId);

      if (!user || !user.email) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionó email y el usuario no tiene email configurado'
        });
      }

      emailToUse = user.email;
      console.log(`✅ Email obtenido del usuario: ${emailToUse}`);
    } else {
      console.log(`✅ Email proporcionado: ${emailToUse}`);
    }

    // Actualizar la orden
    await storage.updateOrderEmail(parseInt(orderId), emailToUse);

    console.log('========================================');
    console.log('✅ Email actualizado exitosamente');
    console.log('========================================');

    return res.json({
      success: true,
      message: 'Email de orden actualizado exitosamente',
      data: {
        orderId: parseInt(orderId),
        email: emailToUse
      }
    });

  } catch (error) {
    console.error('❌ Error actualizando email de orden:', error);
    console.error('Stack:', error.stack);

    return res.status(500).json({
      success: false,
      message: 'Error actualizando email de orden',
      error: error.message
    });
  }
};

/**
 * Endpoint de diagnóstico para verificar la configuración del webhook de Suno
 * GET /webhook/suno-config
 */
export const checkSunoWebhookConfig = async (req, res) => {
  try {
    const sunoCallbackUrl = process.env.SUNO_CALLBACK_URL;
    const sunoApiKey = process.env.SUNO_API_KEY;
    const port = process.env.PORT || 3000;

    console.log('========================================');
    console.log('🔍 DIAGNÓSTICO DE WEBHOOK DE SUNO');
    console.log('========================================');

    const diagnostics = {
      timestamp: new Date().toISOString(),
      configuration: {
        sunoCallbackUrl: {
          configured: !!sunoCallbackUrl,
          value: sunoCallbackUrl || 'NO CONFIGURADO',
          valid: sunoCallbackUrl && (sunoCallbackUrl.startsWith('http://') || sunoCallbackUrl.startsWith('https://'))
        },
        sunoApiKey: {
          configured: !!sunoApiKey,
          value: sunoApiKey ? `${sunoApiKey.substring(0, 10)}...` : 'NO CONFIGURADO'
        },
        serverPort: port,
        expectedWebhookPath: '/webhook/suno',
        fullWebhookUrl: sunoCallbackUrl || `http://localhost:${port}/webhook/suno`
      },
      webhookEndpoint: {
        path: '/webhook/suno',
        method: 'POST',
        contentType: 'application/json',
        registered: true
      },
      recommendations: []
    };

    // Validaciones y recomendaciones
    if (!sunoCallbackUrl) {
      diagnostics.recommendations.push({
        level: 'WARNING',
        message: 'SUNO_CALLBACK_URL no está configurado. El sistema usará polling en lugar de webhooks.',
        solution: 'Configura SUNO_CALLBACK_URL en tu archivo .env con una URL pública (ej: usando ngrok)'
      });
    } else if (!sunoCallbackUrl.includes('webhook/suno')) {
      diagnostics.recommendations.push({
        level: 'ERROR',
        message: 'SUNO_CALLBACK_URL no apunta al endpoint correcto',
        solution: `La URL debe terminar en /webhook/suno. Ejemplo: ${sunoCallbackUrl.split('/webhook')[0]}/webhook/suno`
      });
    } else if (sunoCallbackUrl.includes('localhost') || sunoCallbackUrl.includes('127.0.0.1')) {
      diagnostics.recommendations.push({
        level: 'ERROR',
        message: 'SUNO_CALLBACK_URL usa localhost, pero Suno necesita una URL pública',
        solution: 'Usa ngrok u otro servicio de tunneling. Ejecuta: npx ngrok http 3000'
      });
    } else {
      diagnostics.recommendations.push({
        level: 'SUCCESS',
        message: 'SUNO_CALLBACK_URL está configurado correctamente',
        details: `Suno enviará webhooks a: ${sunoCallbackUrl}`
      });
    }

    if (!sunoApiKey) {
      diagnostics.recommendations.push({
        level: 'ERROR',
        message: 'SUNO_API_KEY no está configurado',
        solution: 'Configura SUNO_API_KEY en tu archivo .env'
      });
    }

    // Agregar información sobre cómo probar
    diagnostics.testing = {
      manualTest: {
        description: 'Ejecuta este comando para simular un webhook de Suno',
        command: 'node test-webhook.js'
      },
      realTest: {
        description: 'Genera una canción real y monitorea los logs',
        steps: [
          '1. Genera una canción desde tu frontend o Postman',
          '2. Espera ~60 segundos',
          '3. Busca en los logs: "📨 WEBHOOK DE SUNO RECIBIDO"',
          '4. Si no aparece, el webhook no está llegando'
        ]
      },
      ngrokSetup: {
        description: 'Si no estás usando ngrok, configúralo así:',
        steps: [
          '1. Instala ngrok: npm install -g ngrok',
          '2. Ejecuta: ngrok http 3000',
          '3. Copia la URL HTTPS (ej: https://abc123.ngrok-free.app)',
          '4. En .env: SUNO_CALLBACK_URL=https://abc123.ngrok-free.app/webhook/suno',
          '5. Reinicia tu servidor'
        ]
      }
    };

    console.log('Configuración verificada');
    console.log('Recomendaciones:', diagnostics.recommendations.length);

    return res.json({
      success: true,
      diagnostics
    });

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Endpoint de prueba para forzar el envío de correo de una orden
 * POST /webhook/test-email/:orderId
 */
export const testEmailSend = async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log('========================================');
    console.log(`📧 TEST - Forzando envío de correo para orden ${orderId}`);
    console.log('========================================');

    // Verificar que la orden existe
    const order = await storage.getOrderById(parseInt(orderId));

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden no encontrada'
      });
    }

    // Obtener las canciones de la orden
    const songs = await storage.getOrderSongs(parseInt(orderId));

    if (songs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay canciones en esta orden'
      });
    }

    console.log(`📊 Canciones encontradas: ${songs.length}`);
    songs.forEach((song, index) => {
      console.log(`  ${index + 1}. ${song.title || 'N/A'} - Status: ${song.status} - AudioURL: ${song.audioUrl ? '✅' : '❌'}`);
    });

    const completedSongs = songs.filter(song => song.status === 'completed' && song.audioUrl);

    if (completedSongs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay canciones completadas con audio en esta orden',
        details: {
          total: songs.length,
          generating: songs.filter(s => s.status === 'generating').length,
          failed: songs.filter(s => s.status === 'failed').length,
          completed: songs.filter(s => s.status === 'completed').length,
          completedWithAudio: completedSongs.length
        }
      });
    }

    // Verificar email
    if (!order.userEmail) {
      return res.status(400).json({
        success: false,
        message: 'La orden no tiene email de usuario'
      });
    }

    console.log(`📧 Enviando email a: ${order.userEmail}`);
    console.log(`📊 Canciones completadas: ${completedSongs.length}`);

    // Enviar email
    const emailResult = await emailService.sendSongsReadyEmail(
      order.userEmail,
      completedSongs,
      parseInt(orderId)
    );

    if (emailResult.success) {
      console.log(`✅ Email de prueba enviado exitosamente`);
      if (emailResult.previewUrl) {
        console.log(`📧 Preview URL: ${emailResult.previewUrl}`);
      }

      return res.json({
        success: true,
        message: 'Email enviado exitosamente',
        data: {
          orderId,
          email: order.userEmail,
          songsCount: completedSongs.length,
          messageId: emailResult.messageId,
          previewUrl: emailResult.previewUrl
        }
      });
    } else {
      console.error(`❌ Error enviando email: ${emailResult.error}`);

      return res.status(500).json({
        success: false,
        message: 'Error enviando email',
        error: emailResult.error
      });
    }

  } catch (error) {
    console.error('❌ Error en testEmailSend:', error);
    console.error('Stack:', error.stack);

    return res.status(500).json({
      success: false,
      message: 'Error procesando la prueba de email',
      error: error.message
    });
  }
};
