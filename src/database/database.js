import Sequelize from 'sequelize';

export const sequelize = new Sequelize("postgres", "postgres", "manager", {
  host: "localhost",
  dialect: "postgres"
});