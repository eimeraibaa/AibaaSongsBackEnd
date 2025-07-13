// src/models/index.js
import sequelize from '../config/database.js';
import { User }    from './user.model.js';
import { Payment } from './payment.model.js';
import { SongRequest } from './songRequest.model.js';


// Asignaciones de relaciones
User.hasMany(Payment,   { foreignKey: 'userId' });
Payment.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(SongRequest,   { foreignKey: 'userId' });
SongRequest.belongsTo(User, { foreignKey: 'userId' });
// (Opcional) sincronizar o exportar sequelize para luego hacer sync/importar en tu app.js
// await sequelize.sync({ alter: true });

export { sequelize, User, Payment , SongRequest };

