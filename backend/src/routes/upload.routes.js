import { Router } from 'express';
import { uploadMediaController } from '../controllers/upload.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { singleImageUpload } from '../middlewares/upload.middleware.js';
import { badRequestResponse } from '../utils/response.util.js';

const router = Router();

const uploadHandler = (req, res, next) => {
  const upload = singleImageUpload('image');
  upload(req, res, (err) => {
    if (err) {
      return badRequestResponse(req, res, err.message || 'Upload error');
    }
    return next();
  });
};

router.post('/media', requireAuth, uploadHandler, uploadMediaController);

export default router;
