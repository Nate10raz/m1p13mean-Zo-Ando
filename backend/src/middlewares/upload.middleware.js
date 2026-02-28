import multer from 'multer';

const storage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'));
  }
  return cb(null, true);
};

export const productImageUpload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10,
  },
}).array('images', 10);

export const singleImageUpload = (fieldName = 'image') =>
  multer({
    storage,
    fileFilter: imageFilter,
    limits: {
      fileSize: 3 * 1024 * 1024,
      files: 1,
    },
  }).single(fieldName);
