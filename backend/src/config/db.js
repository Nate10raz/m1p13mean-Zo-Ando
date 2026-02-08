import mongoose from 'mongoose';
import { ENV } from './env.js';
import dns from 'dns';
// Forcer Node à utiliser Cloudflare + Google (permet souvent de corriger resolveSrv)
dns.setServers(['1.1.1.1', '8.8.8.8']);

const connectDB = async () => {
  try {
    console.log('Tentative de connexion à MongoDB Atlas...');
    // mongoose.connect retourne une Promise ; avec mongoose >=6 les options par défaut conviennent.
    await mongoose.connect(ENV.MONGO_URI, {
      // options non obligatoires avec les versions récentes :
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    console.log(`MongoDB connecté ✅ (host: ${mongoose.connection.host})`);
  } catch (err) {
    console.error('Erreur connexion MongoDB ❌', err);
    process.exit(1);
  }
};

// Optionnel : gestion fermeture propre (Ctrl+C)
process.on('SIGINT', async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB déconnecté (SIGINT).');
    process.exit(0);
  } catch (err) {
    console.error('Erreur lors de la déconnexion:', err);
    process.exit(1);
  }
});

export default connectDB;
