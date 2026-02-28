import cloudinary from '../config/cloudinary.js';
import { ENV } from '../config/env.js';
import { apiResponse } from '../utils/response.util.js';

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

export const uploadSingleImageController = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new Error('Aucun fichier fourni');
    }
    if (!ENV.CLOUDINARY_CLOUD_NAME || !ENV.CLOUDINARY_API_KEY || !ENV.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary configuration is missing');
    }

    const folder = req.body.folder || 'general';
    const result = await uploadToCloudinary(
      req.file,
      `${ENV.CLOUDINARY_FOLDER || 'm1p13'}/${folder}`,
    );

    apiResponse({
      req,
      res,
      status: 200,
      message: 'Image uploadée avec succès',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
      },
    });
  } catch (error) {
    next(error);
  }
};
