const mongoose = require('mongoose');

// Schema for individual background images
const backgroundImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  filename: { type: String, default: '' },
  uploadedAt: { type: Date, default: Date.now }
});

const idCardSettingsSchema = new mongoose.Schema({
  // Array of all uploaded background images
  backgroundImages: [backgroundImageSchema],
  // Currently active background image ID
  activeBackgroundId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Get the active background image
idCardSettingsSchema.virtual('activeBackground').get(function() {
  if (!this.activeBackgroundId || !this.backgroundImages.length) return null;
  return this.backgroundImages.find(img => img._id.equals(this.activeBackgroundId)) || null;
});

// Ensure virtuals are included in JSON
idCardSettingsSchema.set('toJSON', { virtuals: true });
idCardSettingsSchema.set('toObject', { virtuals: true });

// Ensure only one settings document exists
idCardSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({ backgroundImages: [] });
  }
  return settings;
};

module.exports = mongoose.model('IDCardSettings', idCardSettingsSchema);
