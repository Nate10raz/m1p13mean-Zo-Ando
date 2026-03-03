import mongoose from 'mongoose';
import dns from 'dns';
import { ENV } from '../src/config/env.js';
import Boutique from '../src/models/Boutique.js';
import Produit from '../src/models/Produit.js';
import MouvementStock from '../src/models/MouvementStock.js';

const getNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const run = async () => {
  if (!ENV.MONGO_URI) {
    throw new Error('MONGO_URI manquant');
  }

  dns.setServers(['1.1.1.1', '8.8.8.8']);

  await mongoose.connect(ENV.MONGO_URI);

  const boutiques = await Boutique.find({}).select('_id userId').lean();
  const boutiqueUserMap = new Map(
    boutiques
      .filter((b) => b && b._id && b.userId)
      .map((b) => [b._id.toString(), b.userId.toString()]),
  );

  const existingPairs = new Set();
  const pairCursor = MouvementStock.aggregate([
    {
      $group: {
        _id: {
          produitId: '$produitId',
          boutiqueId: '$boutiqueId',
        },
      },
    },
  ]).cursor({ batchSize: 1000 });

  for await (const row of pairCursor) {
    if (!row?._id?.produitId || !row?._id?.boutiqueId) continue;
    existingPairs.add(`${row._id.produitId}:${row._id.boutiqueId}`);
  }

  let processed = 0;
  let created = 0;
  let skippedExisting = 0;
  let skippedNoBoutique = 0;
  let skippedNoUser = 0;
  let failed = 0;

  const cursor = Produit.find({})
    .select('_id boutiqueId stock.quantite createdAt')
    .lean()
    .cursor({ batchSize: 500 });

  for await (const produit of cursor) {
    processed += 1;
    if (!produit?.boutiqueId) {
      skippedNoBoutique += 1;
      continue;
    }

    const key = `${produit._id}:${produit.boutiqueId}`;
    if (existingPairs.has(key)) {
      skippedExisting += 1;
      continue;
    }

    const userId = boutiqueUserMap.get(produit.boutiqueId.toString());
    if (!userId) {
      skippedNoUser += 1;
      continue;
    }

    const stockAfter = getNumber(produit?.stock?.quantite);
    const quantite = Math.abs(stockAfter);
    const type = stockAfter >= 0 ? (quantite === 0 ? 'ajustement' : 'ajout') : 'ajustement';
    const createdAt = produit.createdAt ? new Date(produit.createdAt) : new Date();

    try {
      await MouvementStock.create({
        produitId: produit._id,
        boutiqueId: produit.boutiqueId,
        type,
        quantite,
        stockAvant: 0,
        stockApres: stockAfter,
        reference: 'backfill',
        userId,
        raison: 'Initial stock backfill',
        createdAt,
      });
      created += 1;
    } catch (error) {
      failed += 1;
      console.error('Backfill failed for product:', produit._id?.toString(), error?.message || error);
    }
  }

  console.log(
    JSON.stringify(
      {
        processed,
        created,
        skippedExisting,
        skippedNoBoutique,
        skippedNoUser,
        failed,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
