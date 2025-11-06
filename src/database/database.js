import Sequelize from 'sequelize';

const isProd = process.env.NODE_ENV === 'production';

export const sequelize = isProd ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      protocol: 'postgres',
      logging: false,
      native: false, // Disable native bindings to avoid issues
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
        // Force IPv4 to avoid IPv6 timeout issues on Railway
        family: 4,
        // Connection timeout settings
        statement_timeout: 30000, // 30 seconds
        idle_in_transaction_session_timeout: 30000,
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    })
  // En desarrollo seguimos usando host, user y pass locales
  : new Sequelize('postgres', 'postgres', 'manager', {
      host: 'localhost',
      dialect: 'postgres',
      logging: console.log,
    });

export default sequelize;
