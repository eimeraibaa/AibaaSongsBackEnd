import bcrypt from 'bcryptjs';
import fetch from 'node-fetch'; // si usas node-fetch para webhooks
import { User }        from '../models/users.js';
import { SongRequest } from '../models/songs.js';
import { CartItem }    from '../models/cart.js';
import { Order, OrderItem } from '../models/orders.js';
// import { Lead }        from '../models/leads.js';
// import { ChatMessage } from '../models/chatMessages.js';

export class DatabaseStorage {
  // ==== Usuarios y Auth =================================================
  async getUser(id) {
    return User.findByPk(id);
  }

  async getUserByEmail(email) {
    return User.findOne({ where: { email } });
  }

  async createUser({ firstName, lastName, email, password }) {
    const hashed = await bcrypt.hash(password, 10);
    return User.create({ firstName, lastName, email, password: hashed });
  }

  async verifyPassword(email, plainPassword) {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    const match = await bcrypt.compare(plainPassword, user.password);
    return match ? user : null;
  }

  // ==== Leads ============================================================
  // async createLead({ name, email, message, action, source, pageSection, timestamp }) {
  //   return Lead.create({ name, email, message, action, source, pageSection, timestamp });
  // }

  // async getLeads() {
  //   return Lead.findAll();
  // }

  // ==== Chat Messages ====================================================
  // async createChatMessage({ message, response, timestamp }) {
  //   return ChatMessage.create({ message, response, timestamp });
  // }

  // async getChatMessages() {
  //   return ChatMessage.findAll();
  // }

  // ==== Song Requests ====================================================
  async createSongRequest({ userId, dedicatedTo, email, prompt, genres, timestamp }) {
    return SongRequest.create({ userId: userId || null, dedicatedTo, email, prompt, genres, status: 'pending', timestamp });
  }

  async getSongRequests() {
    return SongRequest.findAll();
  }

  // ==== Carrito ==========================================================
  async addToCart({ userId, dedicatedTo, prompt, genres, previewUrl = null, price = 30.00, status = 'draft' }) {
    return CartItem.create({ userId, dedicatedTo, prompt, genres, previewUrl, status, price, createdAt: new Date(), updatedAt: new Date() });
  }

  async getUserCartItems(userId) {
    return CartItem.findAll({ where: { userId } });
  }

  async updateCartItem(id, updates) {
    await CartItem.update({ ...updates, updatedAt: new Date() }, { where: { id } });
    return CartItem.findByPk(id);
  }

  async removeFromCart(id) {
    return CartItem.destroy({ where: { id } });
  }

  async clearCart(userId) {
    return CartItem.destroy({ where: { userId } });
  }

  async generatePreview(cartItemId) {
    const item = await CartItem.findByPk(cartItemId);
    if (!item) throw new Error('Cart item not found');
    // Lógica de preview (similar a tu implementación existente)
    // Ejemplo con webhook n8n:
    const payload = { cartItemId, prompt: item.prompt, genres: item.genres, dedicatedTo: item.dedicatedTo, timestamp: new Date().toISOString() };
    const res = await fetch('https://n8n.jengoautomatization.site/webhook/generatePreview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const { previewUrl } = await res.json();
    await this.updateCartItem(cartItemId, { previewUrl, status: 'preview_ready' });
    return previewUrl;
  }

  // ==== Órdenes ==========================================================
  async createOrder({ userId, stripePaymentIntentId, totalAmount, status = 'completed', createdAt = new Date() }) {
    return Order.create({ userId, stripePaymentIntentId, totalAmount, status, createdAt });
  }

  async createOrderItem({ orderId, songRequestId = null, dedicatedTo = null, prompt, genres, price, status = 'processing', previewUrl = null, finalUrl = null, createdAt = new Date() }) {
    return OrderItem.create({ orderId, songRequestId, dedicatedTo, prompt, genres, price, status, previewUrl, finalUrl, createdAt });
  }

  async getUserOrders(userId) {
    return Order.findAll({ where: { userId }, order: [['createdAt', 'DESC']], include: [OrderItem] });
  }

  async getOrderById(orderId) {
    return Order.findByPk(orderId, { include: [OrderItem] });
  }

  async getOrderByPaymentIntent(paymentIntentId) {
    return Order.findOne({ where: { stripePaymentIntentId: paymentIntentId }, include: [OrderItem] });
  }

  async updateOrderItemStatus(orderItemId, status) {
    return OrderItem.update({ status }, { where: { id: orderItemId } });
  }

  async checkIfSongAlreadyPaid(userId, prompt) {
    const item = await OrderItem.findOne({ where: { prompt }, include: [{ model: Order, where: { userId } }] });
    return item;
  }

  async linkSongToOrderItem(orderItemId, songRequestId) {
    return OrderItem.update({ songRequestId }, { where: { id: orderItemId } });
  }
}

export const storage = new DatabaseStorage();
