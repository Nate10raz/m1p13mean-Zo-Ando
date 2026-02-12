import mongoose from 'mongoose';
import dns from 'dns';
import { ENV } from '../src/config/env.js';

const run = async () => {
  if (!ENV.MONGO_URI) {
    throw new Error('MONGO_URI manquant');
  }

  // Force DNS servers to avoid SRV resolution issues (same as db.js)
  dns.setServers(['1.1.1.1', '8.8.8.8']);

  await mongoose.connect(ENV.MONGO_URI);
  const collection = mongoose.connection.db.collection('boutiques');

  try {
    await collection.dropIndex('boxId_1');
    console.log('Index boxId_1 supprimé');
  } catch (error) {
    if (error?.codeName === 'IndexNotFound' || error?.code === 27) {
      console.log('Index boxId_1 inexistant (ok)');
    } else {
      throw error;
    }
  }

  await collection.createIndex(
    { boxId: 1 },
    { unique: true, partialFilterExpression: { boxId: { $exists: true, $ne: null } } },
  );
  console.log('Index boxId_1 partiel créé');

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Migration échouée:', error);
  process.exit(1);
});
