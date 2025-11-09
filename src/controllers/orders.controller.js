import { storage } from '../services/storage.js';

export const createOrder = async (req, res) => {
  try {
    const { userId, stripePaymentIntentId, totalAmount, status , userEmail } = req.body;
    // Verificar que el usuario autenticado coincida
    if (req.user.id !== userId) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }
    const order = await storage.createOrder({
      userId,
      stripePaymentIntentId,
      totalAmount,
      userEmail,
      status: status || 'completed',
    });
    res.json({ success: true, order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Error creating order: ' + error.message });
  }
};

export const createOrderItem = async (req, res) => {
  try {
    console.log('========================================');
    console.log('📝 [POST /orders/createOrderItem] Request recibida');
    console.log('========================================');
    console.log('Body completo:', JSON.stringify(req.body, null, 2));
    console.log('language en body:', req.body.language);
    console.log('language type:', typeof req.body.language);
    console.log('language is null?:', req.body.language === null);
    console.log('language is undefined?:', req.body.language === undefined);
    console.log('========================================');

    // 🔧 FIX: Si el frontend NO envía language, intentar obtenerlo del CartItem
    let languageToUse = req.body.language;

    if (!languageToUse && req.body.orderId && req.body.prompt) {
      console.log('⚠️ Language no proporcionado, buscando CartItem asociado...');

      try {
        // Obtener el userId de la orden
        const order = await storage.getOrderById(req.body.orderId);
        if (order) {
          console.log(`📦 Orden encontrada: userId=${order.userId}`);

          // Buscar CartItem con el mismo prompt del usuario
          const cartItems = await storage.getUserCartItems(order.userId);
          const matchingCartItem = cartItems.find(item => item.prompt === req.body.prompt);

          if (matchingCartItem) {
            languageToUse = matchingCartItem.language;
            console.log(`✅ CartItem encontrado: language="${languageToUse}"`);
          } else {
            console.log('⚠️ No se encontró CartItem con ese prompt');
          }
        }
      } catch (error) {
        console.error('❌ Error buscando CartItem:', error.message);
      }
    }

    // Si aún no tenemos language, usar 'es' como fallback
    if (!languageToUse) {
      languageToUse = 'es';
      console.log('⚠️ Usando fallback: language="es"');
    }

    console.log(`📊 Language final a usar: "${languageToUse}"`);
    console.log('========================================');

    // Crear OrderItem con el language correcto
    const orderItemData = {
      ...req.body,
      language: languageToUse  // Sobrescribir con el valor correcto
    };

    const orderItem = await storage.createOrderItem(orderItemData);

    console.log('✅ OrderItem creado desde endpoint REST');
    console.log('   - OrderItem.id:', orderItem.id);
    console.log('   - OrderItem.language:', orderItem.language);
    console.log('========================================');

    res.json({ success: true, item : orderItem });
  } catch (error) {
    console.error('Error creating order item:', error);
    res.status(500).json({ success: false, message: 'Error creating order item: ' + error.message });
  }
};

export const getUserOrders = async (req, res) => {
  try {
    console.log('Fetching orders for user:', req.user.id);
    const userId = req.user.id;
    const orders = await storage.getUserOrders(userId);
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, message: 'Error fetching orders: ' + error.message });
  }
};

// src/controllers/songRequests.controller.js

// src/controllers/orders.controller.js
export const checkSongPayment = async (req, res) => {
  try {

    const { songs } = req.body;
    const userId = req.user.id; // Passport.js usa req.user.id directamente

    // por cada prompt comprobamos si ya existe pago
      const songStatuses = await Promise.all(
        songs.map(async song => {
          const existingPayment = await storage.checkIfSongAlreadyPaid(userId, song.prompt);
          return {
            prompt: song.prompt,
            isPaid: !!existingPayment,
            orderItem: existingPayment
          };
        })
      );

    return res.json({ success: true, songStatuses });
  } catch (error) {
    console.error('Error checking song payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking payment: ' + error.message
    });
  }
};

// src/controllers/orders.controller.js
export const updateOrderItemStatus = async (req, res) => {
  try {
    const orderItemId = parseInt(req.params.id, 10);
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const updatedItem = await storage.updateOrderItemStatus(orderItemId, status);
    if (!updatedItem) {
      return res.status(404).json({ success: false, message: 'Order item not found' });
    }

    res.json({ success: true, orderItem: updatedItem });
  } catch (err) {
    console.error('Error updating order item status:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};



