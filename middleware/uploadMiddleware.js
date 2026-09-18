const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm|mkv|mov|avi|pdf/;
  const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/');

  if (extName || mimeType) {
    return cb(null, true);
  } else {
    cb(new Error('Only video and image/document files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max limit
  fileFilter
});

module.exports = upload;
