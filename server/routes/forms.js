const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const FormConfig = require('../model/FormConfig');
const FormSubmission = require('../model/FormSubmission');
const fieldDefinitions = require('../config/fieldDefinitions');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer with Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'dynamic_forms',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    resource_type: 'auto'
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow image files for photo field
    if (file.fieldname === 'photo') {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for photo uploads'), false);
      }
    } else {
      cb(null, true);
    }
  }
});

// Get all forms with school names
router.get('/', async (req, res) => {
  try {
    const forms = await FormConfig.find().sort({ createdAt: -1 });
    res.json({ success: true, data: forms });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get all schools with their submissions count
router.get('/schools/all', async (req, res) => {
  try {
    const forms = await FormConfig.find();
    const schoolsMap = {};
    
    // Group forms by school
    for (const form of forms) {
      if (!schoolsMap[form.schoolName]) {
        const count = await FormSubmission.countDocuments({ 
          formConfigId: form._id 
        });
        schoolsMap[form.schoolName] = {
          schoolName: form.schoolName,
          forms: [],
          totalSubmissions: count
        };
      }
      schoolsMap[form.schoolName].forms.push(form);
    }
    
    const schools = Object.values(schoolsMap);
    res.json({ success: true, data: schools });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get all submissions for a school
router.get('/school/:schoolName/submissions', async (req, res) => {
  try {
    const { schoolName } = req.params;
    
    // Find all forms for this school
    const forms = await FormConfig.find({ schoolName });
    const formIds = forms.map(f => f._id);
    
    // Get all submissions for these forms
    const submissions = await FormSubmission.find({
      formConfigId: { $in: formIds }
    }).sort({ submittedAt: -1 });
    
    // Enrich submissions with form and school info
    const enrichedSubmissions = submissions.map(sub => {
      const form = forms.find(f => f._id.toString() === sub.formConfigId.toString());
      const subObj = sub.toObject();
      
      // Convert Map to plain object if needed
      let submissionData = subObj.submissionData;
      if (submissionData instanceof Map) {
        submissionData = Object.fromEntries(submissionData);
      } else if (submissionData && typeof submissionData.toJSON === 'function') {
        submissionData = submissionData.toJSON();
      }
      
      return {
        ...subObj,
        submissionData,
        formName: form?.formName || 'Unknown Form',
        schoolName: schoolName
      };
    });
    
    res.json({ success: true, data: enrichedSubmissions });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get available fields
router.get('/fields/available', (req, res) => {
  try {
    res.json({ 
      success: true, 
      data: fieldDefinitions 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get form structure for rendering
router.get('/:formId/structure', async (req, res) => {
  try {
    const formConfig = await FormConfig.findById(req.params.formId);
    
    if (!formConfig) {
      return res.status(404).json({ 
        success: false, 
        message: 'Form not found' 
      });
    }
    
    // Build form structure with field definitions
    const formStructure = {
      formName: formConfig.formName,
      schoolName: formConfig.schoolName,
      fields: formConfig.selectedFields
        .sort((a, b) => a.order - b.order)
        .map(field => ({
          ...fieldDefinitions[field.fieldName],
          fieldName: field.fieldName,
          isRequired: field.isRequired
        }))
    };
    
    res.json({ success: true, data: formStructure });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Submit form data
router.post('/:formId/submit', upload.single('photo'), async (req, res) => {
  try {
    const formConfig = await FormConfig.findById(req.params.formId);
    
    if (!formConfig) {
      return res.status(404).json({ 
        success: false, 
        message: 'Form not found' 
      });
    }
    
    // Build submission data
    const submissionData = { ...req.body };
    
    // Add file info if photo was uploaded (Cloudinary)
    if (req.file) {
      submissionData.photo = {
        filename: req.file.originalname,
        url: req.file.path, // Cloudinary URL
        cloudinaryPublicId: req.file.filename, // Cloudinary public ID
        mimetype: req.file.mimetype,
        size: req.file.size
      };
    }
    
    // Validate required fields
    const errors = [];
    formConfig.selectedFields.forEach(field => {
      const fieldValue = submissionData[field.fieldName];
      if (field.isRequired && !fieldValue) {
        errors.push(`${field.fieldName} is required`);
      }
    });
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors 
      });
    }
    
    // Save submission
    const submission = new FormSubmission({
      formConfigId: req.params.formId,
      submissionData
    });
    
    await submission.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Form submitted successfully',
      data: submission
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get form submissions
router.get('/:formId/submissions', async (req, res) => {
  try {
    const submissions = await FormSubmission
      .find({ formConfigId: req.params.formId })
      .sort({ submittedAt: -1 });
    
    res.json({ success: true, data: submissions });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Update form submission
router.put('/:formId/submissions/:submissionId', async (req, res) => {
  try {
    const submission = await FormSubmission.findById(req.params.submissionId);
    
    if (!submission) {
      return res.status(404).json({ 
        success: false, 
        message: 'Submission not found' 
      });
    }
    
    // Check if submission belongs to this form
    if (submission.formConfigId.toString() !== req.params.formId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }
    
    // Update submission data
    submission.submissionData = req.body.submissionData || req.body;
    await submission.save();
    
    res.json({ 
      success: true, 
      message: 'Submission updated successfully',
      data: submission
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Delete form submission
router.delete('/:formId/submissions/:submissionId', async (req, res) => {
  try {
    const submission = await FormSubmission.findById(req.params.submissionId);
    
    if (!submission) {
      return res.status(404).json({ 
        success: false, 
        message: 'Submission not found' 
      });
    }
    
    // Check if submission belongs to this form
    if (submission.formConfigId.toString() !== req.params.formId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }
    
    await FormSubmission.findByIdAndDelete(req.params.submissionId);
    
    res.json({ 
      success: true, 
      message: 'Submission deleted successfully'
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;
