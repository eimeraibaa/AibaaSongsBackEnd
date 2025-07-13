import { DataTypes } from 'sequelize';
import {sequelize} from '../database/database.js';

export const Payment = sequelize.define('payments', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false, // en centavos
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "usd",
  },
  stripePaymentIntentId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false, // e.g. 'requires_payment_method', 'succeeded'
  },
})
