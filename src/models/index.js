// src/models/index.js
import sequelize from "../database/database.js";
import { User } from "./users.js";
import { Payment } from "./payment.js";
import { SongRequest } from "./songs.js";
import { CartItem } from "./cart.js";
import { Order, OrderItem } from "./orders.js";
import { Song } from "./song.js";

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
OrderItem.hasOne(Song, { foreignKey: "orderItemId" });

OrderItem.belongsTo(SongRequest, {foreignKey: "songRequestId",as: "songRequest",
});

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
};
