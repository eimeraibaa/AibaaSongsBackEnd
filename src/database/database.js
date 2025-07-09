import Sequelize from 'sequelize';

const isProd = process.env.NODE_ENV === 'production';

export const sequelize = isProd ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      protocol: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    })
  // En desarrollo seguimos usando host, user y pass locales
  : new Sequelize('postgres', 'postgres', 'manager', {
      host: 'localhost',
      dialect: 'postgres',
      logging: console.log,
    });

export default sequelize;
