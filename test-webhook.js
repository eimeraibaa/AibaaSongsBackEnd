#!/usr/bin/env node

/**
 * Script de prueba para simular un webhook de Stripe
 * Esto te permite probar el flujo completo sin hacer un pago real
 *
 * Uso:
 *   node test-webhook.js
 */

import fetch from 'node-fetch';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// Simular un webhook de Stripe (checkout.session.completed)
const mockWebhook = {
  id: 'evt_test_webhook_' + Date.now(),
  object: 'event',
  api_version: '2023-10-16',
  created: Math.floor(Date.now() / 1000),
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_' + Date.now(),
      object: 'checkout.session',
      amount_total: 2999, // $29.99 en centavos
      currency: 'usd',
      customer_email: 'test@example.com',
      customer_details: {
        email: 'test@example.com'
      },
      payment_intent: 'pi_test_' + Date.now(),
      payment_status: 'paid',
      status: 'complete',
      metadata: {
        type: 'cart_checkout',
        userId: '1', // ⚠️ CAMBIAR ESTO al ID de tu usuario de prueba
        cartItemIds: '1', // ⚠️ CAMBIAR ESTO a los IDs de tus cart items (ej: "1,2,3")
        itemCount: '1',
        createdAt: new Date().toISOString()
      }
    }
  }
};

console.log('========================================');
console.log('🧪 TEST DE WEBHOOK DE STRIPE');
console.log('========================================');
console.log('');
console.log('⚠️ IMPORTANTE: Antes de ejecutar este test:');
console.log('');
console.log('1. Crea un cart item:');
console.log('   POST /api/cart/add');
console.log('   { dedicatedTo: "Test", prompt: "Test song", genres: ["pop"] }');
console.log('');
console.log('2. Genera las letras:');
console.log('   POST /api/cart/:id/generate-preview');
console.log('');
console.log('3. Anota el ID del cart item y el ID de tu usuario');
console.log('');
console.log('4. Actualiza este script con esos IDs (líneas 27-28)');
console.log('');
console.log('========================================');
console.log('');

// Mostrar los datos que se van a enviar
console.log('📋 Datos del webhook simulado:');
console.log('');
console.log('   Tipo:', mockWebhook.type);
console.log('   Session ID:', mockWebhook.data.object.id);
console.log('   Payment Intent:', mockWebhook.data.object.payment_intent);
console.log('   Monto:', mockWebhook.data.object.amount_total / 100, mockWebhook.data.object.currency.toUpperCase());
console.log('   Email:', mockWebhook.data.object.customer_email);
console.log('');
console.log('   Metadata:');
console.log('     - userId:', mockWebhook.data.object.metadata.userId);
console.log('     - cartItemIds:', mockWebhook.data.object.metadata.cartItemIds);
console.log('     - type:', mockWebhook.data.object.metadata.type);
console.log('');
console.log('========================================');
console.log('');

// Preguntar al usuario si quiere continuar
console.log('¿Los datos anteriores son correctos?');
console.log('');
console.log('Presiona Ctrl+C para cancelar o Enter para continuar...');

// Esperar input del usuario
process.stdin.once('data', async () => {
  console.log('');
  console.log('🚀 Enviando webhook simulado a:', BACKEND_URL + '/webhook/stripe');
  console.log('');

  try {
    const response = await fetch(BACKEND_URL + '/webhook/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Normalmente Stripe envía una firma, pero en desarrollo el backend lo ignora
      },
      body: JSON.stringify(mockWebhook)
    });

    const result = await response.json();

    console.log('========================================');
    console.log('📨 RESPUESTA DEL WEBHOOK:');
    console.log('========================================');
    console.log('');
    console.log('Status:', response.status);
    console.log('Body:', JSON.stringify(result, null, 2));
    console.log('');

    if (response.ok && result.received) {
      console.log('✅ Webhook recibido correctamente');
      console.log('');
      console.log('📋 PRÓXIMOS PASOS:');
      console.log('');
      console.log('1. Revisa los logs del servidor');
      console.log('   - Busca: "📨 Webhook recibido"');
      console.log('   - Busca: "🎵 Generando canciones"');
      console.log('');
      console.log('2. Verifica que se creó la orden en la base de datos');
      console.log('   - Tabla: orders');
      console.log('   - Busca por: stripePaymentIntentId =', mockWebhook.data.object.payment_intent);
      console.log('');
      console.log('3. Verifica que se crearon las canciones');
      console.log('   - Tabla: songs');
      console.log('   - Status: "generating" o "completed"');
      console.log('');
    } else {
      console.log('❌ Error procesando webhook');
      console.log('');
      console.log('Revisa:');
      console.log('- Que el servidor esté corriendo');
      console.log('- Que la URL sea correcta:', BACKEND_URL);
      console.log('- Los logs del servidor para más detalles');
    }

    console.log('========================================');
    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('');
    console.error('Posibles causas:');
    console.error('- El servidor no está corriendo');
    console.error('- La URL es incorrecta:', BACKEND_URL);
    console.error('- Hay un problema de red');
    console.error('');
    process.exit(1);
  }
});
