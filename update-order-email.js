// =============================================
// SCRIPT PARA ACTUALIZAR EMAIL DE ORDEN
// Actualiza el userEmail de una orden específica
// =============================================

import 'dotenv/config';
import { Order, User } from './src/models/index.js';

const orderId = process.argv[2];
const userEmail = process.argv[3];

if (!orderId) {
  console.log('========================================');
  console.log('📧 ACTUALIZAR EMAIL DE ORDEN');
  console.log('========================================');
  console.log('');
  console.log('Uso:');
  console.log('  node update-order-email.js <orderId> [email]');
  console.log('');
  console.log('Ejemplos:');
  console.log('  # Actualizar con el email del usuario de la orden');
  console.log('  node update-order-email.js 1');
  console.log('');
  console.log('  # Actualizar con un email específico');
  console.log('  node update-order-email.js 1 usuario@example.com');
  console.log('');
  process.exit(1);
}

async function updateOrderEmail() {
  try {
    console.log('========================================');
    console.log('📧 Actualizando email de orden');
    console.log('========================================');
    console.log('');

    // Obtener la orden
    const order = await Order.findByPk(orderId, {
      include: [{ model: User }]
    });

    if (!order) {
      console.log(`❌ Orden ${orderId} no encontrada`);
      process.exit(1);
    }

    console.log('📊 Orden encontrada:');
    console.log(`  - ID: ${order.id}`);
    console.log(`  - User ID: ${order.userId}`);
    console.log(`  - Email actual: ${order.userEmail || 'N/A'}`);
    console.log(`  - Total: $${order.totalAmount}`);
    console.log(`  - Status: ${order.status}`);
    console.log('');

    // Determinar el email a usar
    let emailToUse = userEmail;

    if (!emailToUse) {
      // Si no se proporcionó email, obtener del usuario
      const user = await User.findByPk(order.userId);

      if (!user) {
        console.log(`❌ Usuario ${order.userId} no encontrado`);
        process.exit(1);
      }

      if (!user.email) {
        console.log(`❌ Usuario ${order.userId} no tiene email configurado`);
        process.exit(1);
      }

      emailToUse = user.email;
      console.log(`✅ Email obtenido del usuario: ${emailToUse}`);
    } else {
      console.log(`✅ Email proporcionado: ${emailToUse}`);
    }

    console.log('');

    // Actualizar la orden
    await order.update({ userEmail: emailToUse });

    console.log('========================================');
    console.log('✅ ORDEN ACTUALIZADA EXITOSAMENTE');
    console.log('========================================');
    console.log('');
    console.log(`📧 Email configurado: ${emailToUse}`);
    console.log('');
    console.log('Ahora puedes:');
    console.log(`  1. Generar una nueva canción para esta orden`);
    console.log(`  2. O probar el envío de email:`);
    console.log(`     curl -X POST http://localhost:3000/webhook/test-email/${orderId}`);
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

updateOrderEmail();
