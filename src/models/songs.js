import { DataTypes } from 'sequelize';
import { sequelize } from '../database/database.js';

export const SongRequest = sequelize.define(
  'song_requests',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
      allowNull: false,
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'pending',
    },
    previewUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    finalUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 30.00,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: 'song_requests',
    timestamps: false,
  }
);
