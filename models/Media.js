const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ['video', 'photo'], default: 'video' },
    mediaSource: { type: String, enum: ['link', 'file'], default: 'link' },
    url: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
    playlistName: { type: String, default: 'General' },
    description: { type: String, default: '' },
    isPaid: { type: Boolean, default: false },
    price: { type: Number, default: 0 },
    allowedStudentIds: [{ type: String }],
    uploadedBy: { type: String, default: 'Admin' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Media', mediaSchema);
