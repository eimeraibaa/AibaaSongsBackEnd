import { DataTypes } from 'sequelize';
import { sequelize } from '../database/database.js';

export const SharedSong = sequelize.define('shared_songs', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  songId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  shareToken: { type: DataTypes.STRING(128), allowNull: false, unique: true },
  title: { type: DataTypes.STRING, allowNull: true },
  message: { type: DataTypes.TEXT, allowNull: true },
  viewCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  feedbackCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  expiresAt: { type: DataTypes.DATE, allowNull: true },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'shared_songs',
  timestamps: true
});

export default SharedSong;
