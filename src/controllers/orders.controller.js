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
    res.json({ success: true, orderItem });
  } catch (error) {
    console.error('Error creating order item:', error);
    res.status(500).json({ success: false, message: 'Error creating order item: ' + error.message });
  }
};

export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await storage.getUserOrders(userId);
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, message: 'Error fetching orders: ' + error.message });
  }
};

export const checkSongPayment = async (req, res) => {
  try {
    const { userId, prompt } = req.body;
    if (req.user.id !== userId) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }
    const existing = await storage.checkIfSongAlreadyPaid(userId, prompt);
    res.json({ success: true, alreadyPaid: !!existing, orderItem: existing || null });
  } catch (error) {
    console.error('Error checking song payment:', error);
    res.status(500).json({ success: false, message: 'Error checking payment: ' + error.message });
  }
};
