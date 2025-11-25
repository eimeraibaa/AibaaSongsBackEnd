// src/models/index.js
import sequelize from "../database/database.js";
import { User } from "./users.js";
import { Payment } from "./payment.js";
import { SongRequest } from "./songs.js";
import { CartItem } from "./cart.js";
import { Order, OrderItem } from "./orders.js";
import { Song } from "./song.js";
import { SongFeedback } from './songFeedback.js';
import { SharedSong } from './sharedSong.js';

// Relaciones
User.hasMany(Payment, { foreignKey: "userId" });
Payment.belongsTo(User, { foreignKey: "userId" });

User.hasMany(SongRequest, { foreignKey: "userId" });
SongRequest.belongsTo(User, { foreignKey: "userId" });

User.hasMany(CartItem, { foreignKey: "userId" });
CartItem.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Order, { foreignKey: "userId" });
Order.belongsTo(User, { foreignKey: "userId" });

Order.hasMany(OrderItem, { foreignKey: "orderId", as: "items" });
OrderItem.belongsTo(Order, { foreignKey: "orderId", as: "order" });

SongRequest.hasMany(OrderItem, { foreignKey: "songRequestId" });
OrderItem.belongsTo(SongRequest, { foreignKey: "songRequestId" });

Song.belongsTo(OrderItem, { foreignKey: "orderItemId" });
OrderItem.hasMany(Song, { foreignKey: "orderItemId", as: "songs" });

OrderItem.belongsTo(SongRequest, {foreignKey: "songRequestId",as: "songRequest",
});

// New models
Song.hasMany(SongFeedback, { foreignKey: 'songId' });
SongFeedback.belongsTo(Song, { foreignKey: 'songId' });

User.hasMany(SharedSong, { foreignKey: 'userId' });
SharedSong.belongsTo(User, { foreignKey: 'userId' });

Song.hasMany(SharedSong, { foreignKey: 'songId' });
SharedSong.belongsTo(Song, { foreignKey: 'songId' });

// **IMPORTANTE** Exportar aquí todos los modelos ya “asociados”
export {
  sequelize,
  User,
  Payment,
  SongRequest,
  CartItem,
  Order,
  OrderItem,
  Song,
  SongFeedback,
  SharedSong
};
