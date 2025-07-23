// src/models/index.js
import sequelize from '../config/database.js';
import { User }    from './user.model.js';
import { Payment } from './payment.model.js';
import { SongRequest } from './songRequest.model.js';
import { cart } from './cart.model.js';
import { Order, OrderItem } from './orders.js';


// Asignaciones de relaciones
User.hasMany(Payment,   { foreignKey: 'userId' });
Payment.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(SongRequest,   { foreignKey: 'userId' });
SongRequest.belongsTo(User, { foreignKey: 'userId' });
// (Opcional) sincronizar o exportar sequelize para luego hacer sync/importar en tu app.js
// await sequelize.sync({ alter: true });

User.hasMany(cart,   { foreignKey: 'userId' });
cart.belongsTo(User, { foreignKey: 'userId' });

// Asociaciones
User.hasMany(Order, { foreignKey: 'userId' });
Order.belongsTo(User, { foreignKey: 'userId' });

Order.hasMany(OrderItem, { foreignKey: 'orderId' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

SongRequest.hasMany(OrderItem, { foreignKey: 'songRequestId' });
OrderItem.belongsTo(SongRequest, { foreignKey: 'songRequestId' });


export { sequelize, User, Payment , SongRequest };

