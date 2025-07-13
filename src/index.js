import app from "./app.js";
import { sequelize } from "./database/database.js";

const port = process.env.PORT || 3000;

async function main() {
  try {
    await sequelize.sync({ force: true }); // Use force: true to drop and recreate tables

    
    app.listen(port, () => {
      console.log("API escuchando en el puerto", port);
    });
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
}

main();

