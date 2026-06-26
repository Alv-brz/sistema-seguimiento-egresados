import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`✅ API corriendo en http://localhost:${env.port}`);
  console.log(`   Frontend (CORS): ${env.frontendOrigin}`);
  console.log(`   BD: ${env.db.user}@${env.db.host}:${env.db.port}/${env.db.database}`);
});

// Apagado limpio: cierra el servidor y avisa para cerrar el pool si fuera necesario.
process.on("SIGINT", () => {
  server.close(() => {
    console.log("\n🛑 Servidor detenido.");
    process.exit(0);
  });
});
