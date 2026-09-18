const express = require('express');
const router = express.Router();
const { 
  createMedia, 
  getAllMedia, 
  updateMedia, 
  deleteMedia,
  grantStudentAccess,
  revokeStudentAccess,
  makeMediaFreeForAll,
  makeAllMediaFree
} = require('../controllers/mediaController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/', protect, adminOnly, upload.single('file'), createMedia);
router.get('/', protect, getAllMedia);
router.put('/make-all-free', protect, adminOnly, makeAllMediaFree);
router.put('/:id', protect, adminOnly, updateMedia);
router.delete('/:id', protect, adminOnly, deleteMedia);

router.post('/:id/grant-access', protect, adminOnly, grantStudentAccess);
router.post('/:id/revoke-access', protect, adminOnly, revokeStudentAccess);
router.put('/:id/make-free', protect, adminOnly, makeMediaFreeForAll);

module.exports = router;
