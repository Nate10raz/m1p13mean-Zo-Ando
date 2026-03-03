import multer from 'multer';

const storage = multer.memoryStorage();

const mediaFilter = (req, file, cb) => {
  if (
    !file.mimetype ||
    (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/'))
  ) {
    return cb(new Error('Only image and video files are allowed'));
  }
  return cb(null, true);
};

export const productImageUpload = multer({
  storage,
  fileFilter: mediaFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 10,
  },
});

export const singleImageUpload = (fieldName = 'image') =>
  multer({
    storage,
    fileFilter: mediaFilter,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB for videos
      files: 1,
    },
  }).single(fieldName);
