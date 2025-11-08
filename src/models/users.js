import { DataTypes } from 'sequelize';
import {sequelize} from '../database/database.js';

export const User = sequelize.define('users', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  firstName: { type: DataTypes.STRING, allowNull: false },
  lastName: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: true }, // nullable para OAuth
  googleId: { type: DataTypes.STRING, allowNull: true, unique: true },
  facebookId: { type: DataTypes.STRING, allowNull: true, unique: true },
  authProvider: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'local' // 'local', 'google', 'facebook'
  },
  profilePicture: { type: DataTypes.STRING, allowNull: true }
})

User.prototype.toSafeObject = function() {
  const { password, ...safeUser } = this.toJSON();
  return safeUser;
};

