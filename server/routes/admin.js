const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const FormConfig = require('../model/FormConfig');
const IDCardSettings = require('../model/IDCardSettings');
const fieldDefinitions = require('../config/fieldDefinitions');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer with Cloudinary storage for background images
const bgStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'id_card_backgrounds',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    resource_type: 'image'
  }
});

const uploadBg = multer({
  storage: bgStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Admin credentials (In production, use a proper database with hashed passwords)
const ADMIN_CREDENTIALS = {
  email: 'admin@gmail.com',
  password: '1234'
};

// Admin Login Route
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check credentials (In production, compare hashed passwords)
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
      // In production, use JWT with proper secret
      const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
      
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            email,
            role: 'admin'
          }
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create new form configuration
router.post('/forms', async (req, res) => {
  try {
    const { formName, schoolName, schoolAddress, selectedFields } = req.body;
    
    // Validate selected fields
    const validFields = selectedFields.filter(field => 
      fieldDefinitions.hasOwnProperty(field.fieldName)
    );
    
    const formConfig = new FormConfig({
      formName,
      schoolName,
      schoolAddress: schoolAddress || '',
      selectedFields: validFields
    });
    
    await formConfig.save();
    res.status(201).json({ 
      success: true, 
      message: 'Form created successfully', 
      data: formConfig 
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get all form configurations
router.get('/forms', async (req, res) => {
  try {
    const forms = await FormConfig.find();
    res.json({ success: true, data: forms });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get single form configuration
router.get('/forms/:id', async (req, res) => {
  try {
    const form = await FormConfig.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ 
        success: false, 
        message: 'Form not found' 
      });
    }
    res.json({ success: true, data: form });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Update form configuration
router.put('/forms/:id', async (req, res) => {
  try {
    const { formName, schoolName, schoolAddress, selectedFields } = req.body;
    
    const validFields = selectedFields.filter(field => 
      fieldDefinitions.hasOwnProperty(field.fieldName)
    );
    
    const updatedForm = await FormConfig.findByIdAndUpdate(
      req.params.id,
      { formName, schoolName, schoolAddress: schoolAddress || '', selectedFields: validFields },
      { new: true, runValidators: true }
    );
    
    if (!updatedForm) {
      return res.status(404).json({ 
        success: false, 
        message: 'Form not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Form updated successfully', 
      data: updatedForm 
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Delete form configuration
router.delete('/forms/:id', async (req, res) => {
  try {
    const form = await FormConfig.findByIdAndDelete(req.params.id);
    
    if (!form) {
      return res.status(404).json({ 
        success: false, 
        message: 'Form not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Form deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get available field definitions
router.get('/fields/available', (req, res) => {
  res.json({ 
    success: true, 
    data: fieldDefinitions 
  });
  console.log(fieldDefinitions);
});

// ==================== ID Card Settings Routes ====================

// Get ID Card settings (all background images and active one)
router.get('/id-card-settings', async (req, res) => {
  try {
    const settings = await IDCardSettings.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Upload a new background image (adds to collection)
router.post('/id-card-settings/background', uploadBg.single('backgroundImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    let settings = await IDCardSettings.getSettings();

    // Add new image to the array
    const newImage = {
      url: req.file.path,
      publicId: req.file.filename,
      filename: req.file.originalname || 'Background Image',
      uploadedAt: new Date()
    };

    settings.backgroundImages.push(newImage);
    settings.updatedAt = new Date();

    // If this is the first image, set it as active
    if (settings.backgroundImages.length === 1) {
      settings.activeBackgroundId = settings.backgroundImages[0]._id;
    }

    await settings.save();

    res.json({
      success: true,
      message: 'Background image uploaded successfully',
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Set active background image
router.put('/id-card-settings/background/:imageId/activate', async (req, res) => {
  try {
    const { imageId } = req.params;
    const settings = await IDCardSettings.getSettings();
    
    // Check if image exists
    const imageExists = settings.backgroundImages.some(img => img._id.toString() === imageId);
    if (!imageExists) {
      return res.status(404).json({
        success: false,
        message: 'Background image not found'
      });
    }

    settings.activeBackgroundId = imageId;
    settings.updatedAt = new Date();
    await settings.save();

    res.json({
      success: true,
      message: 'Background image activated successfully',
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete a specific background image
router.delete('/id-card-settings/background/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    const settings = await IDCardSettings.getSettings();
    
    // Find the image to delete
    const imageToDelete = settings.backgroundImages.find(img => img._id.toString() === imageId);
    
    if (!imageToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Background image not found'
      });
    }

    // Delete from Cloudinary
    if (imageToDelete.publicId) {
      try {
        await cloudinary.uploader.destroy(imageToDelete.publicId);
      } catch (e) {
        console.log('Could not delete image from Cloudinary:', e.message);
      }
    }

    // Remove from array
    settings.backgroundImages = settings.backgroundImages.filter(img => img._id.toString() !== imageId);
    
    // If deleted image was active, set new active or clear
    if (settings.activeBackgroundId && settings.activeBackgroundId.toString() === imageId) {
      settings.activeBackgroundId = settings.backgroundImages.length > 0 
        ? settings.backgroundImages[0]._id 
        : null;
    }
    
    settings.updatedAt = new Date();
    await settings.save();

    res.json({
      success: true,
      message: 'Background image deleted successfully',
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Clear active background (no background applied)
router.delete('/id-card-settings/background/active/clear', async (req, res) => {
  try {
    const settings = await IDCardSettings.getSettings();
    settings.activeBackgroundId = null;
    settings.updatedAt = new Date();
    await settings.save();

    res.json({
      success: true,
      message: 'Active background cleared',
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
