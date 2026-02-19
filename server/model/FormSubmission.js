const mongoose = require('mongoose');

const formSubmissionSchema = new mongoose.Schema({
  formConfigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FormConfig',
    required: true
  },
  submissionData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

// Transform Map to plain object when converting to JSON
formSubmissionSchema.set('toJSON', {
  transform: function(doc, ret) {
    if (ret.submissionData instanceof Map) {
      ret.submissionData = Object.fromEntries(ret.submissionData);
    }
    return ret;
  }
});

formSubmissionSchema.set('toObject', {
  transform: function(doc, ret) {
    if (ret.submissionData instanceof Map) {
      ret.submissionData = Object.fromEntries(ret.submissionData);
    }
    return ret;
  }
});

module.exports = mongoose.model('FormSubmission', formSubmissionSchema);
