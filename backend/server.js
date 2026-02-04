import app from './src/app.js';
import connectDB from './src/config/db.js';
import { ENV } from './src/config/env.js';

// Connecte la base de données
connectDB();

// Utilise le port défini dans ENV
const PORT = ENV.PORT;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${ENV.NODE_ENV} mode`);
});
