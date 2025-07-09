import app from "./app.js";
import { sequelize } from "./database/database.js";

async function main() {
  try {
    await sequelize.sync({ force: true }); // Use force: true to drop and recreate tables
    app.listen(3000);
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
}

main();

