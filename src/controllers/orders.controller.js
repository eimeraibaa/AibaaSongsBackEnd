import { storage } from '../services/storage.js';

export const createOrder = async (req, res) => {
  try {
    const { userId, stripePaymentIntentId, totalAmount, status } = req.body;
    // Verificar que el usuario autenticado coincida
    if (req.user.id !== userId) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }
    const order = await storage.createOrder({
      userId,
      stripePaymentIntentId,
      totalAmount,
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
    const orderItem = await storage.createOrderItem(req.body);
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



