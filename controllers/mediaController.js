const Media = require('../models/Media');

// @desc    Add Video or Photo (Admin)
// @route   POST /api/media
// @access  Private/Admin
const createMedia = async (req, res) => {
  try {
    const { title, type, url, playlistName, description } = req.body;
    if (!title || !url) {
      return res.status(400).json({ message: 'Title and URL/File are required' });
    }

    const newMedia = await Media.create({
      title: title.trim(),
      type: type || 'video',
      url: url.trim(),
      playlistName: playlistName && playlistName.trim() ? playlistName.trim() : 'General',
      description: description || '',
      uploadedBy: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'Admin'
    });

    return res.status(201).json(newMedia);
  } catch (error) {
    return res.status(500).json({ message: 'Error adding media item' });
  }
};

// @desc    Get all media & playlists (Admin & Student)
// @route   GET /api/media
// @access  Private
const getAllMedia = async (req, res) => {
  try {
    const { type, playlist } = req.query;
    let query = {};
    if (type) query.type = type;
    if (playlist && playlist !== 'all') query.playlistName = playlist;

    const mediaList = await Media.find(query).sort({ createdAt: -1 });
    
    // Extract unique playlist names
    const playlists = await Media.distinct('playlistName');

    return res.json({
      media: mediaList,
      playlists
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching media' });
  }
};

// @desc    Update Media Item (Admin)
// @route   PUT /api/media/:id
// @access  Private/Admin
const updateMedia = async (req, res) => {
  try {
    const { title, type, url, playlistName, description } = req.body;
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ message: 'Media item not found' });
    }

    media.title = title || media.title;
    media.type = type || media.type;
    media.url = url || media.url;
    media.playlistName = playlistName || media.playlistName;
    media.description = description !== undefined ? description : media.description;

    const updatedMedia = await media.save();
    return res.json(updatedMedia);
  } catch (error) {
    return res.status(500).json({ message: 'Error updating media' });
  }
};

// @desc    Delete Media Item (Admin)
// @route   DELETE /api/media/:id
// @access  Private/Admin
const deleteMedia = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ message: 'Media item not found' });
    }
    await Media.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Media item deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting media' });
  }
};

module.exports = {
  createMedia,
  getAllMedia,
  updateMedia,
  deleteMedia
};
