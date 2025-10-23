import app from "./app.js";
import { sequelize } from "./database/database.js";

//const port = process.env.PORT || 3000;
const port = 3000;


async function main() {
  try {
    // IMPORTANTE: force: false para NO borrar datos en producción
    // Solo usar force: true en desarrollo inicial para recrear schemas
    await sequelize.sync({ force: true, alter: false });
    console.log("✅ Base de datos sincronizada");

    app.listen(port, () => {
      console.log("API escuchando en el puerto", port);
    });
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
}

main();

