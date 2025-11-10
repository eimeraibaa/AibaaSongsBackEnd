import { DataTypes } from 'sequelize';
import { sequelize } from '../database/database.js';

export const CartItem = sequelize.define(
  'cart_items',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
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
      allowNull: true,
    },
    previewUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'draft',
    },
    lyrics: {
    type: DataTypes.TEXT,
    allowNull: true, // processing, completed, delivered
    },
    language: {
      type: DataTypes.STRING(2),
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 30.00,
    },
    favoriteMemory: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    },
    whatYouLikeMost: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    },
    occasion: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    },
    userEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'cart_items',
    timestamps: false,
  }
)