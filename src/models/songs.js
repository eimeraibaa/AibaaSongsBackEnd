import { DataTypes } from 'sequelize';
import { sequelize } from '../database/database.js';

export const SongRequest = sequelize.define('song_requests', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  dedicatedTo: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  email: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  prompt: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  genres: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: false
  },
  status: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: 'pending'
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false
  }
});
