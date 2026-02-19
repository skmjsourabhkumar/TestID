import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formAPI } from '../../services/api';
import '../../styles/DynamicForm.css';

const DynamicForm = ({ formId }) => {
  const navigate = useNavigate();
  const [formStructure, setFormStructure] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  const loadFormStructure = useCallback(async () => {
    try {
      const response = await formAPI.getFormStructure(formId);
      setFormStructure(response.data.data);
    } catch (error) {
      console.error('Error loading form:', error);
      setMessage('Failed to load form');
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    loadFormStructure();
  }, [loadFormStructure]);

  const handleChange = (fieldName, value) => {
    setFormData({
      ...formData,
      [fieldName]: value
    });
    
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors({
        ...errors,
        [fieldName]: null
      });
    }
  };

  const handleFileChange = (fieldName, file) => {
    setFormData({
      ...formData,
      [fieldName]: file
    });
    
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors({
        ...errors,
        [fieldName]: null
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    formStructure.fields.forEach(field => {
      if (field.isRequired && !formData[field.fieldName]) {
        newErrors[field.fieldName] = `${field.label} is required`;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setMessage('Please fill all required fields');
      return;
    }
    
    setSubmitting(true);
    setMessage('');

    try {
      // Create FormData object for file uploads
      const submitData = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (formData[key] instanceof File) {
          submitData.append(key, formData[key]);
        } else {
          submitData.append(key, formData[key] || '');
        }
      });

      await formAPI.submitForm(formId, submitData);
      setMessage('Form submitted successfully!');
      setFormData({});
    } catch (error) {
      console.error('Error submitting form:', error);
      setMessage(error.response?.data?.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading form...</div>;
  }

  if (!formStructure) {
    return <div className="error">Form not found</div>;
  }

  return (
    <div className="dynamic-form-page">
      <div className="form-top-bar">
        {/* <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Forms
        </button> */}
      </div>
      
      <div className="dynamic-form-container">
        <div className="form-header">
          <h1>{formStructure.schoolName}</h1>
          <h2>{formStructure.formName}</h2>
        </div>

        {message && (
          <div className={`alert ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="dynamic-form" encType="multipart/form-data">
        {formStructure.fields.map((field) => (
          <div key={field.fieldName} className="form-field">
            <label htmlFor={field.fieldName}>
              {field.label}
              {field.isRequired && <span className="required">*</span>}
            </label>

            {field.type === 'select' ? (
              <select
                id={field.fieldName}
                value={formData[field.fieldName] || ''}
                onChange={(e) => handleChange(field.fieldName, e.target.value)}
                required={field.isRequired}
              >
                <option value="">Select {field.label}</option>
                {field.options?.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                id={field.fieldName}
                value={formData[field.fieldName] || ''}
                onChange={(e) => handleChange(field.fieldName, e.target.value)}
                placeholder={field.placeholder || `Enter ${field.label}`}
                required={field.isRequired}
                rows={4}
              />
            ) : field.type === 'file' ? (
              <div className="file-input-wrapper">
                <input
                  id={field.fieldName}
                  type="file"
                  onChange={(e) => handleFileChange(field.fieldName, e.target.files[0])}
                  required={field.isRequired}
                  accept={field.accept || '*/*'}
                  className="file-input"
                />
                <label htmlFor={field.fieldName} className="file-input-label">
                  {formData[field.fieldName]?.name || (field.placeholder || `Choose ${field.label}`)}
                </label>
              </div>
            ) : (
              <input
                id={field.fieldName}
                type={field.type}
                value={formData[field.fieldName] || ''}
                onChange={(e) => handleChange(field.fieldName, e.target.value)}
                placeholder={field.placeholder || `Enter ${field.label}`}
                required={field.isRequired}
              />
            )}

            {errors[field.fieldName] && (
              <span className="error-message">{errors[field.fieldName]}</span>
            )}
          </div>
        ))}

        <button type="submit" disabled={submitting} className="submit-button">
          {submitting ? 'Submitting...' : 'Submit Form'}
        </button>
      </form>
      </div>
    </div>
  );
};

export default DynamicForm;
