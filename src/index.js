import 'dotenv/config';
import app from "./app.js";
import { sequelize } from "./database/database.js";

const port = process.env.PORT || 3000;
//const port = 3000;

// 🔒 Validar variables de entorno críticas
function validateEnvVariables() {
  const required = [
    'STRIPE_SECRET_KEY',
    'DATABASE_URL',
    'SESSION_SECRET',
    'BACKEND_URL'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('\n❌ ERROR: Variables de entorno faltantes:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n📝 Asegúrate de configurar estas variables en:');
    console.error('   - Railway Dashboard → Variables (para producción)');
    console.error('   - Archivo .env (para desarrollo local)\n');
    process.exit(1);
  }

  console.log('✅ Variables de entorno críticas validadas');
}

async function main() {
  // Validar variables antes de iniciar
  validateEnvVariables();
  try {
    // IMPORTANTE: force: false para NO borrar datos en producción
    // Solo usar force: true en desarrollo inicial para recrear schemas
    await sequelize.sync({ force: false, alter: false });
    console.log("✅ Base de datos sincronizada");

    app.listen(port, () => {
      console.log("API escuchando en el puerto", port);
    });
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
}

main();

