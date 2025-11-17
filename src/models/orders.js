import { DataTypes } from 'sequelize';
import sequelize from '../database/database.js';
import { User } from './users.js';
import { SongRequest } from './songs.js';

// Orden (historial de compras)
export const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  stripePaymentIntentId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'completed', // completed, refunded, failed
  },
  userEmail: {
    type: DataTypes.STRING,
    allowNull: true, // Opcional para mantener compatibilidad con órdenes antiguas
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'orders',
  timestamps: false,
});

// Item de orden (canción pagada)
export const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Order,
      key: 'id',
    },
  },
  songRequestId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: SongRequest,
      key: 'id',
    },
  },
  dedicatedTo: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  prompt: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  genres: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: false,
  },
  singerGender: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  emotion: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: 'happy',
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    // No default value - price must be provided from cart item or configuration
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'processing', // processing, completed, delivered
  },
  lyrics: {
    type: DataTypes.TEXT,
    allowNull: true, // Letras generadas con OpenAI para Suno
  },
  language: {
    type: DataTypes.STRING(5),
    allowNull: false,
  },
  previewUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  finalUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'order_items',
  timestamps: false,
});

export default { Order, OrderItem };
