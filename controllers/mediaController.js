const Media = require('../models/Media');
const path = require('path');

// @desc    Add Video or Photo (Admin)
// @route   POST /api/media
// @access  Private/Admin
const createMedia = async (req, res) => {
  try {
    const { title, type, mediaSource, url, playlistName, description, isPaid, price } = req.body;
    
    if (!title || (!url && !req.file)) {
      return res.status(400).json({ message: 'Title and URL or File upload are required' });
    }

    let fileUrl = '';
    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
    }

    const isPaidBool = isPaid === true || isPaid === 'true';
    const priceNum = isPaidBool ? Number(price) || 0 : 0;

    const newMedia = await Media.create({
      title: title.trim(),
      type: type || 'video',
      mediaSource: req.file ? 'file' : (mediaSource || 'link'),
      url: url ? url.trim() : (fileUrl ? fileUrl : ''),
      fileUrl: fileUrl,
      playlistName: playlistName && playlistName.trim() ? playlistName.trim() : 'General',
      description: description || '',
      isPaid: isPaidBool,
      price: priceNum,
      allowedStudentIds: [],
      uploadedBy: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'Admin'
    });

    return res.status(201).json(newMedia);
  } catch (error) {
    console.error('Error creating media:', error);
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

    const rawMediaList = await Media.find(query).sort({ createdAt: -1 });
    
    // Extract unique playlist names
    const playlists = await Media.distinct('playlistName');

    const studentId = req.user ? req.user.studentId : null;
    const isAdmin = req.user && req.user.role === 'admin';

    // Map items to include access permission for students
    const mediaList = rawMediaList.map(item => {
      const itemObj = item.toObject();
      if (isAdmin) {
        itemObj.hasAccess = true;
      } else {
        if (!itemObj.isPaid) {
          itemObj.hasAccess = true;
        } else if (studentId && Array.isArray(itemObj.allowedStudentIds) && itemObj.allowedStudentIds.includes(studentId)) {
          itemObj.hasAccess = true;
        } else {
          itemObj.hasAccess = false;
        }
      }
      return itemObj;
    });

    return res.json({
      media: mediaList,
      playlists
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    return res.status(500).json({ message: 'Error fetching media' });
  }
};

// @desc    Update Media Item (Admin)
// @route   PUT /api/media/:id
// @access  Private/Admin
const updateMedia = async (req, res) => {
  try {
    const { title, type, url, playlistName, description, isPaid, price } = req.body;
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ message: 'Media item not found' });
    }

    media.title = title !== undefined ? title : media.title;
    media.type = type !== undefined ? type : media.type;
    if (url) media.url = url;
    media.playlistName = playlistName !== undefined ? playlistName : media.playlistName;
    media.description = description !== undefined ? description : media.description;
    
    if (isPaid !== undefined) {
      media.isPaid = isPaid === true || isPaid === 'true';
      media.price = media.isPaid ? Number(price) || 0 : 0;
    }

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

// @desc    Grant student access to a paid media item (Admin)
// @route   POST /api/media/:id/grant-access
// @access  Private/Admin
const grantStudentAccess = async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ message: 'Media item not found' });
    }

    if (!media.allowedStudentIds.includes(studentId.trim())) {
      media.allowedStudentIds.push(studentId.trim());
      await media.save();
    }

    return res.json({ message: `Access granted to student ${studentId}`, media });
  } catch (error) {
    return res.status(500).json({ message: 'Error granting student access' });
  }
};

// @desc    Revoke student access from a paid media item (Admin)
// @route   POST /api/media/:id/revoke-access
// @access  Private/Admin
const revokeStudentAccess = async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ message: 'Media item not found' });
    }

    media.allowedStudentIds = media.allowedStudentIds.filter(id => id !== studentId.trim());
    await media.save();

    return res.json({ message: `Access revoked from student ${studentId}`, media });
  } catch (error) {
    return res.status(500).json({ message: 'Error revoking student access' });
  }
};

// @desc    Make single media item free for all students (Admin)
// @route   PUT /api/media/:id/make-free
// @access  Private/Admin
const makeMediaFreeForAll = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ message: 'Media item not found' });
    }

    media.isPaid = false;
    media.price = 0;
    await media.save();

    return res.json({ message: 'Media item is now free for all students', media });
  } catch (error) {
    return res.status(500).json({ message: 'Error making media free' });
  }
};

// @desc    Make all media items free for everyone (Admin)
// @route   PUT /api/media/make-all-free
// @access  Private/Admin
const makeAllMediaFree = async (req, res) => {
  try {
    await Media.updateMany({}, { $set: { isPaid: false, price: 0 } });
    return res.json({ message: 'All media items are now free for all students' });
  } catch (error) {
    return res.status(500).json({ message: 'Error making all media free' });
  }
};

module.exports = {
  createMedia,
  getAllMedia,
  updateMedia,
  deleteMedia,
  grantStudentAccess,
  revokeStudentAccess,
  makeMediaFreeForAll,
  makeAllMediaFree
};
