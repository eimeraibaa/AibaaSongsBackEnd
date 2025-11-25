import { DataTypes } from 'sequelize';
import { sequelize } from '../database/database.js';

export const SongFeedback = sequelize.define('song_feedback', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  songId: { type: DataTypes.INTEGER, allowNull: false },
  shareToken: { type: DataTypes.STRING(128), allowNull: true },
  name: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, allowNull: true },
  rating: { type: DataTypes.INTEGER, allowNull: false },
  comment: { type: DataTypes.TEXT, allowNull: true },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'song_feedback',
  timestamps: true
});

export default SongFeedback;
