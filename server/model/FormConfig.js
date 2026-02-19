const e = require('express');
const mongoose = require('mongoose');

const formConfigSchema = new mongoose.Schema({
  formName: {
    type: String,
    required: true,
    unique: true
  },
  schoolName: {
    type: String,
    required: true
  },
  schoolAddress: {
    type: String,
    default: ''
  },
  selectedFields: [{
    fieldName: {
      type: String,
      required: true,
      enum: [
        'name', 'fatherName', 'motherName', 'address', 
        'dateOfBirth', 'mobileNumber', 'aadhaarNumber', 
        'bloodGroup', 'class', 'section', 'roleNumber', 
        'admissionNumber', 'stream', 'session', 'photo', 'email'
      ]
    },
    isRequired: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('FormConfig', formConfigSchema);
