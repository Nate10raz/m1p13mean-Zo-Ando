import Publication from '../models/Publication.js';
import PublicationVue from '../models/PublicationVue.js';
import Commentaire from '../models/Commentaire.js';
import User from '../models/User.js';
import Boutique from '../models/Boutique.js';
import mongoose from 'mongoose';

class PublicationService {
  async createPublication(data) {
    const publication = new Publication({
      boutiqueId: data.boutiqueId,
      adminId: data.adminId,
      roleAuteur: data.roleAuteur,
      contenu: data.contenu,
      medias: data.medias || [],
      scheduledAt: data.scheduledAt,
      expiresAt: data.expiresAt,
      statut: data.scheduledAt && new Date(data.scheduledAt) > new Date() ? 'planifie' : 'publie',
    });
    const saved = await publication.save();
    return await Publication.findById(saved._id)
      .populate('boutiqueId', 'nom logo description')
      .populate('adminId', 'nom prenom avatar');
  }

  async getFeed(userId, page = 1, limit = 10, search = '') {
    const skip = (page - 1) * limit;
    const now = new Date();

    // Filtre de base pour les publications visibles
    let query = {
      statut: 'publie',
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
    };

    // Si recherche textuelle
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };

      // Trouver les boutiques et admins correspondants
      const [boutiques, admins] = await Promise.all([
        Boutique.find({ nom: searchRegex }).select('_id').lean(),
        User.find({
          $or: [{ nom: searchRegex }, { prenom: searchRegex }],
          role: 'admin',
        })
          .select('_id')
          .lean(),
      ]);

      const boutiqueIds = boutiques.map((b) => b._id);
      const adminIds = admins.map((a) => a._id);

      // On combine le filtre de base avec le filtre de recherche
      query = {
        $and: [
          query, // Statut publié + non expiré
          {
            $or: [
              { contenu: searchRegex },
              { boutiqueId: { $in: boutiqueIds } },
              { adminId: { $in: adminIds } },
            ],
          },
        ],
      };
    }

    const baseFilter = query;

    // Si l'utilisateur est connecté, on gère les vus/non-vus
    if (userId) {
      const seenRecords = await PublicationVue.find({ userId }).select('publicationId');
      const seenIds = seenRecords.map((r) => r.publicationId);

      const totalUnseen = await Publication.countDocuments({
        ...baseFilter,
        _id: { $nin: seenIds },
      });

      let publications = [];

      if (skip < totalUnseen) {
        // On récupère les non-vus
        publications = await Publication.find({
          ...baseFilter,
          _id: { $nin: seenIds },
        })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('boutiqueId', 'nom logo description')
          .populate('adminId', 'nom prenom avatar');

        // Si on n'en a pas assez, on complète avec les vus
        if (publications.length < limit) {
          const remaining = limit - publications.length;
          const seenPubs = await Publication.find({
            ...baseFilter,
            _id: { $in: seenIds },
          })
            .sort({ createdAt: -1 })
            .limit(remaining)
            .populate('boutiqueId', 'nom logo description')
            .populate('adminId', 'nom prenom avatar');

          publications = [...publications, ...seenPubs];
        }
      } else {
        // Déjà vus
        const seenSkip = skip - totalUnseen;
        publications = await Publication.find({
          ...baseFilter,
          _id: { $in: seenIds },
        })
          .sort({ createdAt: -1 })
          .skip(seenSkip)
          .limit(limit)
          .populate('boutiqueId', 'nom logo description')
          .populate('adminId', 'nom prenom avatar');
      }

      return publications;
    } else {
      // Non connecté
      return await Publication.find(baseFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('boutiqueId', 'nom logo description')
        .populate('adminId', 'nom prenom avatar');
    }
  }

  async markAsSeen(userId, publicationId) {
    return await PublicationVue.findOneAndUpdate(
      { userId, publicationId },
      { viewedAt: Date.now() },
      { upsert: true, new: true },
    );
  }

  async toggleLike(userId, publicationId) {
    const publication = await Publication.findById(publicationId);
    if (!publication) throw new Error('Publication non trouvée');

    const index = publication.likes.indexOf(userId);
    if (index === -1) {
      publication.likes.push(userId);
    } else {
      publication.likes.splice(index, 1);
    }

    // Le hook 'pre save' s'occupe du likesCount
    return await publication.save();
  }

  async addComment(userId, publicationId, contenu) {
    const commentaire = new Commentaire({
      userId,
      publicationId,
      contenu,
    });
    return await (await commentaire.save()).populate('userId', 'nom prenom avatar');
  }

  async getComments(publicationId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return await Commentaire.find({ publicationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'nom prenom avatar');
  }

  async deletePublication(publicationId, user) {
    if (!mongoose.Types.ObjectId.isValid(publicationId)) {
      throw new Error('ID de publication invalide');
    }

    const publication = await Publication.findById(publicationId);
    if (!publication) throw new Error('Publication non trouvée');

    // Vérification des droits
    const isAdmin = user.role === 'admin';
    const isOwnerBoutique =
      user.role === 'boutique' &&
      publication.boutiqueId &&
      user.boutiqueId &&
      String(publication.boutiqueId) === String(user.boutiqueId);

    const isOwnerAdmin =
      user.role === 'admin' &&
      publication.adminId &&
      String(publication.adminId) === String(user.id);

    if (isAdmin || isOwnerBoutique || isOwnerAdmin) {
      try {
        await Publication.findByIdAndDelete(publicationId);
        await Commentaire.deleteMany({ publicationId });
        await PublicationVue.deleteMany({ publicationId });
        return true;
      } catch (err) {
        throw new Error('Erreur lors de la suppression en base de données : ' + err.message);
      }
    }
    throw new Error('Non autorisé à supprimer cette publication');
  }

  async reportPublication(publicationId, reporterId, reason) {
    const publication = await Publication.findById(publicationId);
    if (!publication) throw new Error('Publication non trouvée');

    // Vérifier si déjà signalé par cet utilisateur
    const alreadyReported = publication.reports.some(
      (r) => r.reporterId.toString() === reporterId.toString(),
    );
    if (alreadyReported) throw new Error('Vous avez déjà signalé cette publication');

    publication.reports.push({ reporterId, reason });
    return await publication.save();
  }

  async getReportedPublications(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    // On récupère les publications qui ont au moins un signalement
    const reported = await Publication.find({ 'reports.0': { $exists: true } })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('boutiqueId', 'nom logo')
      .populate('adminId', 'nom prenom avatar')
      .populate('reports.reporterId', 'nom prenom avatar');

    return reported;
  }

  async dismissReports(publicationId) {
    const publication = await Publication.findById(publicationId);
    if (!publication) throw new Error('Publication non trouvée');

    publication.reports = [];
    return await publication.save();
  }
}

export default new PublicationService();
