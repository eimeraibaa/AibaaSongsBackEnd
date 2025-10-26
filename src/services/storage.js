import bcrypt from "bcryptjs";
import fetch from "node-fetch";
import { User } from "../models/users.js";
import { SongRequest } from "../models/songs.js";
import { CartItem } from "../models/cart.js";
import { Order, OrderItem } from "../models/index.js";
import { generateLyrics } from "./lyricsService.js";
import { Song } from "../models/song.js";

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

  // ==== Song Requests ====================================================
  async createSongRequest({ userId, dedicatedTo, prompt, genres, timestamp }) {
    return SongRequest.create({
      userId: userId || null,
      dedicatedTo,
      prompt,
      genres,
      status: "pending",
      timestamp,
    });
  }

  async getSongRequests() {
    return SongRequest.findAll();
  }

  // ==== Carrito ==========================================================
  async addToCart({
    userId,
    dedicatedTo,
    prompt,
    genres,
    previewUrl = null,
    price = 30.0,
    status = "draft",
  }) {
    return CartItem.create({
      userId,
      dedicatedTo,
      prompt,
      genres,
      previewUrl,
      status,
      price,
      createdAt: new Date(),
      updatedAt: new Date(),
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
    return CartItem.destroy({ where: { id } });
  }

  async clearCart(userId) {
    return CartItem.destroy({ where: { userId } });
  }

  async generatePreview(cartItemId) {
    const item = await CartItem.findByPk(cartItemId);
    if (!item) throw new Error("Cart item not found");
    // Lógica de preview (similar a tu implementación existente)
    // Ejemplo con webhook n8n:
    const payload = {
      cartItemId,
      prompt: item.prompt,
      genres: item.genres,
      dedicatedTo: item.dedicatedTo,
      timestamp: new Date().toISOString(),
    };
    const res = await fetch(
      "https://n8n.jengoautomatization.site/webhook/generatePreview",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const { previewUrl } = await res.json();
    await this.updateCartItem(cartItemId, {
      previewUrl,
      status: "preview_ready",
    });
    return previewUrl;
  }

  // ==== Órdenes ==========================================================
  async createOrder({
    userId,
    stripePaymentIntentId,
    totalAmount,
    status = "completed",
    userEmail = null,
    createdAt = new Date(),
  }) {
    return Order.create({
      userId,
      stripePaymentIntentId,
      totalAmount,
      status,
      userEmail,
      createdAt,
    });
  }

  async createOrderItem({
    orderId,
    songRequestId = null,
    dedicatedTo = null,
    prompt,
    genres,
    price,
    status = "processing",
    previewUrl = null,
    lyrics,
    finalUrl = null,
    createdAt = new Date(),
  }) {
    return OrderItem.create({
      orderId,
      songRequestId,
      dedicatedTo,
      prompt,
      genres,
      price,
      status,
      previewUrl,
      lyrics,
      finalUrl,
      createdAt,
    });
  }

  async getUserOrders(userId) {
    return Order.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
      include: [{ model: OrderItem, as: "items" }],
    });
  }

  async getOrderById(orderId) {
    return Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: 'items' }]
    });
  }

  async getOrderByPaymentIntent(paymentIntentId) {
    return Order.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
      include: [{ model: OrderItem, as: 'items' }],
    });
  }

  async updateOrderStatus(orderId, status) {
    return Order.update({ status }, { where: { id: orderId } });
  }

  async updateOrderEmail(orderId, email) {
    return Order.update({ userEmail: email }, { where: { id: orderId } });
  }

  async updateOrderItemStatus(orderItemId, status) {
    await OrderItem.update({ status }, { where: { id: orderItemId } });

    const updated = await OrderItem.findByPk(orderItemId);
    return updated; // o null si no existía
  }

  async checkIfSongAlreadyPaid(userId, prompt) {
    const item = await OrderItem.findOne({
      where: { prompt },
      include: [{ model: Order, as: 'order', where: { userId } }],
    });
    return item;
  }

  async linkSongToOrderItem(orderItemId, songRequestId) {
    return OrderItem.update({ songRequestId }, { where: { id: orderItemId } });
  }

  // Métodos para cart items con letras
  // Métodos para cart items con letras
  async getCartItemById(cartItemId) {
    const item = await CartItem.findByPk(cartItemId);
    return item; // Sequelize ya devuelve null si no existe
  }

  async updateCartItemLyrics(cartItemId, lyrics) {
    await CartItem.update({ lyrics }, { where: { id: cartItemId } });

    const updatedItem = await CartItem.findByPk(cartItemId);
    return updatedItem; // o null si no existía
  }

  async generateLyricsForCartItem(cartItemId) {
    try {
      // 1. Obtener el cart item
      const cartItem = await CartItem.findByPk(cartItemId);
      if (!cartItem) {
        throw new Error("Cart item no encontrado");
      }

      // 2. Generar letras con IA
      const lyrics = await generateLyrics(
        cartItem.prompt,
        cartItem.genres,
        cartItem.dedicatedTo
      );

      // 3. Actualizar el cart item con las letras generadas
      await CartItem.update(
        {
          lyrics,
          status: "lyrics_ready", // Actualizar estado
        },
        { where: { id: cartItemId } }
      );

      // 4. Devolver el item actualizado
      const updatedItem = await CartItem.findByPk(cartItemId);
      return updatedItem;
    } catch (error) {
      console.error("Error generating lyrics for cart item:", error);
      throw error;
    }
  }

  async createSong(orderItemId, songData) {
    try {
      const song = await Song.create({
        orderItemId,
        title: songData.title,
        lyrics: songData.lyrics,
        audioUrl: songData.audioUrl,
        imageUrl: songData.imageUrl,
        sunoSongId: songData.sunoSongId,
        genre: songData.genre,
        status: "generating", // Inicialmente en estado de generación
        createdAt: new Date(),
      });

      return song;
    } catch (error) {
      console.error("Error creando canción:", error);
      throw error;
    }
  }

  async updateSongStatus(songId, status, audioUrl = null) {
    try {
      const updateData = { status };
      if (audioUrl) updateData.audioUrl = audioUrl;

      await Song.update(updateData, { where: { id: songId } });
      return await Song.findByPk(songId);
    } catch (error) {
      console.error("Error actualizando canción:", error);
      throw error;
    }
  }

  async getSongById(songId) {
    try {
      const song = await Song.findByPk(songId, {
        include: [
          {
            model: OrderItem,
            as: 'OrderItem',
            include: [
              {
                model: Order,
                as: 'Order',
                attributes: ['id', 'userId', 'totalAmount', 'status', 'createdAt']
              }
            ]
          }
        ]
      });

      return song;
    } catch (error) {
      console.error("Error obteniendo canción por ID:", error);
      throw error;
    }
  }

  async getUserSongs(userId) {
    try {
      // Obtener todas las canciones del usuario a través de las órdenes
      const songs = await Song.findAll({
        include: [
          {
            model: OrderItem,
            as: 'OrderItem',
            required: true,
            include: [
              {
                model: Order,
                as: 'Order',
                where: { userId },
                attributes: ['id', 'userId', 'totalAmount', 'status', 'createdAt']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return songs;
    } catch (error) {
      console.error("Error obteniendo canciones del usuario:", error);
      throw error;
    }
  }

  async getOrderSongs(orderId) {
    try {
      // Obtener todas las canciones de una orden específica
      const songs = await Song.findAll({
        include: [
          {
            model: OrderItem,
            as: 'OrderItem',
            where: { orderId },
            required: true
          }
        ],
        order: [['createdAt', 'ASC']]
      });

      return songs;
    } catch (error) {
      console.error("Error obteniendo canciones de la orden:", error);
      throw error;
    }
  }

  async getSongBySunoId(sunoSongId) {
    try {
      const song = await Song.findOne({
        where: { sunoSongId }
      });

      return song;
    } catch (error) {
      console.error("Error obteniendo canción por Suno ID:", error);
      throw error;
    }
  }

  async updateSongImage(songId, imageUrl) {
    try {
      await Song.update(
        { imageUrl },
        { where: { id: songId } }
      );

      return await Song.findByPk(songId);
    } catch (error) {
      console.error("Error actualizando imagen de canción:", error);
      throw error;
    }
  }

  async updateSongSunoId(songId, sunoSongId) {
    try {
      await Song.update(
        { sunoSongId },
        { where: { id: songId } }
      );

      return await Song.findByPk(songId);
    } catch (error) {
      console.error("Error actualizando sunoSongId de canción:", error);
      throw error;
    }
  }

  async getOrderItemById(orderItemId) {
    try {
      return await OrderItem.findByPk(orderItemId);
    } catch (error) {
      console.error("Error obteniendo order item por ID:", error);
      throw error;
    }
  }

  async getOrderItemsWithLyrics(orderId) {
    try {
      console.log("📦 Buscando order items para orden:", orderId);

      // Obtener todos los order items de esta orden
      const orderItems = await OrderItem.findAll({
        where: { orderId },
      });

      console.log("📝 Order items encontrados:", orderItems.length);

      if (!orderItems || orderItems.length === 0) {
        console.warn(
          "⚠️ No se encontraron order items para la orden:",
          orderId
        );
        return [];
      }

      // Convertir a objetos planos y extraer la info necesaria
      const itemsData = orderItems.map((item) => {
        const itemJson = item.toJSON();

        return {
          id: itemJson.id,
          orderId: itemJson.orderId,
          songRequestId: itemJson.songRequestId,
          dedicatedTo: itemJson.dedicatedTo,
          prompt: itemJson.prompt,
          genres: itemJson.genres,
          price: itemJson.price,
          status: itemJson.status,
          lyrics: itemJson.lyrics || null, // Las letras YA están en el order item
        };
      });

      // Log para debug
      console.log(
        "📊 Items procesados:",
        itemsData.map((item) => ({
          id: item.id,
          hasLyrics: !!item.lyrics,
          lyricsLength: item.lyrics?.length || 0,
          lyricsPreview: item.lyrics?.substring(0, 50) || "sin letras",
        }))
      );

      // Filtrar solo los que tienen letras
      const itemsWithLyrics = itemsData.filter(
        (item) => item.lyrics && item.lyrics.trim().length > 0
      );

      if (itemsWithLyrics.length === 0) {
        console.error(
          "❌ NINGÚN ITEM TIENE LETRAS. Revisa que las letras se estén guardando correctamente."
        );
        console.error("Items sin filtrar:", itemsData);
      }

      console.log(
        `✅ ${itemsWithLyrics.length}/${itemsData.length} items con letras listos`
      );

      return itemsWithLyrics;
    } catch (error) {
      console.error("❌ Error obteniendo order items con letras:", error);
      console.error("Stack:", error.stack);
      throw new Error(
        "Error al obtener items de la orden con letras: " + error.message
      );
    }
  }
}

export const storage = new DatabaseStorage();
