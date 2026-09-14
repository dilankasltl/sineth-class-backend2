const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ['video', 'photo'], default: 'video' },
    url: { type: String, required: true },
    playlistName: { type: String, default: 'General' },
    description: { type: String, default: '' },
    uploadedBy: { type: String, default: 'Admin' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Media', mediaSchema);
