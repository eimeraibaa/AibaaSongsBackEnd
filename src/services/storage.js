// src/services/storage.js
import bcrypt from 'bcryptjs';
import { User }        from '../models/users.js';
import { SongRequest } from '../models/songs.js';
import { CartItem }    from '../models/cart.js';
// (Importa aquí Lead, ChatMessage, etc. si los creas luego)

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
    return User.create({
      firstName, lastName,
      email,
      password: hashed
    });
  }

  async verifyPassword(email, plainPassword) {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    const match = await bcrypt.compare(plainPassword, user.password);
    return match ? user : null;
  }

  // ==== Song Requests ====================================================

  async createSongRequest({ userId, dedicatedTo, email, prompt, genres }) {
    return SongRequest.create({
      userId:    userId || null,
      dedicatedTo,
      email,
      prompt,
      genres,
      status:   'pending',
      timestamp: new Date()
    });
  }

  async getSongRequests() {
    return SongRequest.findAll();
  }

  // ==== Carrito =========================================================

  async addToCart({ userId, dedicatedTo, prompt, genres, previewUrl, price = 30.00, status = 'draft' }) {
    return CartItem.create({
      userId,
      dedicatedTo,
      prompt,
      genres,
      previewUrl,
      status,
      price,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }


  async getUserCartItems(userId) {
    return CartItem.findAll({ where: { userId } });
  }

  async updateCartItem(id, updates) {
    await CartItem.update(
      { ...updates, updatedAt: new Date() },
      { where: { id } }
    );
    return CartItem.findByPk(id);
  }

  async removeFromCart(id) {
    await CartItem.destroy({ where: { id } });
  }

  // ==== Preview (ejemplo de integración externa) ========================

  async generatePreview(cartItemId) {
    const item = await CartItem.findByPk(cartItemId);
    if (!item) throw new Error('Item no encontrado');
    // Lógica para llamar al webhook de n8n, igual que en tu Replit
    // …fetch(…); luego:
    // await this.updateCartItem(cartItemId, { previewUrl, status: 'preview_ready' });
    // return previewUrl;
  }
}

// Exporta una única instancia
export const storage = new DatabaseStorage();
