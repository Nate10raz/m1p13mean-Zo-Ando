import app from './src/app.js';
import connectDB from './src/config/db.js';
import { ENV } from './src/config/env.js';

// Connecte la base de données
await connectDB();

// Utilise le port défini dans ENV
const PORT = ENV.PORT;

const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${ENV.NODE_ENV} mode`);
});

// Augmente le timeout à 10 minutes (600,000 ms) pour les gros uploads de 100Mo
server.timeout = 600000;
server.keepAliveTimeout = 610000;
server.headersTimeout = 620000;
