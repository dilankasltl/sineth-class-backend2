const express = require('express');
const router = express.Router();
const { createMedia, getAllMedia, updateMedia, deleteMedia } = require('../controllers/mediaController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/', protect, adminOnly, createMedia);
router.get('/', protect, getAllMedia);
router.put('/:id', protect, adminOnly, updateMedia);
router.delete('/:id', protect, adminOnly, deleteMedia);

module.exports = router;
