import {
  createProduit,
  getProduitById,
  listProduits,
  updateProduit,
  removeProduitImage,
  setProduitMainImage,
  updateProduitStockAlert,
} from '../services/produit.service.js';
import cloudinary from '../config/cloudinary.js';
import { ENV } from '../config/env.js';

const uploadToCloudinary = (file, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (err, result) => {
        if (err) return reject(err);
        return resolve(result);
      },
    );
    stream.end(file.buffer);
  });
import { apiResponse } from '../utils/response.util.js';

export const createProduitController = async (req, res, next) => {
  try {
    if (!ENV.CLOUDINARY_CLOUD_NAME || !ENV.CLOUDINARY_API_KEY || !ENV.CLOUDINARY_API_SECRET) {
      return next(new Error('Cloudinary configuration is missing'));
    }
    const files = Array.isArray(req.files) ? req.files : [];
    const uploads = files.length
      ? await Promise.all(
          files.map((file) => uploadToCloudinary(file, ENV.CLOUDINARY_FOLDER || 'products')),
        )
      : [];
    const images = uploads.map((result, index) => ({
      url: result.secure_url,
      ordre: index + 1,
      isMain: index === 0,
      publicId: result.public_id,
    }));

    const result = await createProduit(
      {
        ...req.body,
        images,
      },
      {
        userId: req.user?.id,
        role: req.user?.role,
      },
    );

    apiResponse({
      req,
      res,
      status: 201,
      message: 'Produit cree',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getProduitController = async (req, res, next) => {
  try {
    const result = await getProduitById(req.params.id, {
      userId: req.user?.id,
      role: req.user?.role,
    });

    apiResponse({
      req,
      res,
      status: 200,
      message: 'Produit',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listProduitsController = async (req, res, next) => {
  try {
    const result = await listProduits(
      {
        userId: req.user?.id,
        role: req.user?.role,
      },
      {
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        estActif: req.query.estActif,
      },
    );

    apiResponse({
      req,
      res,
      status: 200,
      message: 'Liste des produits',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduitController = async (req, res, next) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    let images = [];

    if (files.length) {
      if (!ENV.CLOUDINARY_CLOUD_NAME || !ENV.CLOUDINARY_API_KEY || !ENV.CLOUDINARY_API_SECRET) {
        return next(new Error('Cloudinary configuration is missing'));
      }
      const uploads = await Promise.all(
        files.map((file) => uploadToCloudinary(file, ENV.CLOUDINARY_FOLDER || 'products')),
      );
      images = uploads.map((result, index) => ({
        url: result.secure_url,
        ordre: index + 1,
        isMain: index === 0,
        publicId: result.public_id,
      }));
    }

    const result = await updateProduit(
      req.params.id,
      {
        ...req.body,
        images,
      },
      {
        userId: req.user?.id,
        role: req.user?.role,
      },
    );

    apiResponse({
      req,
      res,
      status: 200,
      message: 'Produit mis a jour',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduitImageController = async (req, res, next) => {
  try {
    const result = await removeProduitImage(req.params.id, req.params.imageId, {
      userId: req.user?.id,
      role: req.user?.role,
    });

    apiResponse({
      req,
      res,
      status: 200,
      message: 'Image supprimee',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const setProduitMainImageController = async (req, res, next) => {
  try {
    const result = await setProduitMainImage(req.params.id, req.params.imageId, {
      userId: req.user?.id,
      role: req.user?.role,
    });

    apiResponse({
      req,
      res,
      status: 200,
      message: 'Image principale mise a jour',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduitStockAlertController = async (req, res, next) => {
  try {
    const result = await updateProduitStockAlert(
      req.params.id,
      {
        seuilAlerte: req.body.seuilAlerte,
      },
      {
        userId: req.user?.id,
        role: req.user?.role,
      },
    );

    apiResponse({
      req,
      res,
      status: 200,
      message: 'Seuil d\'alerte mis a jour',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
