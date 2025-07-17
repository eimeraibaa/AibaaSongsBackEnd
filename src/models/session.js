import { DataTypes } from 'sequelize';
import {sequelize} from '../database/database.js';

export const Session = sequelize.define('session', {
  sid: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  expires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  data: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'sessions',
  timestamps: true
});