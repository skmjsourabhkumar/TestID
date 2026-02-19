import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import FieldSelector from './FieldSelector';
import FormPreview from './FormPreview';
import '../../styles/FormBuilder.css';

const FormBuilder = ({ formId, onSave }) => {
  const [formName, setFormName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [availableFields, setAvailableFields] = useState({});
  const [selectedFields, setSelectedFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadAvailableFields = useCallback(async () => {
    try {
      const response = await adminAPI.getAvailableFields();
      setAvailableFields(response.data.data);
      console.log("Available fields loaded:", response.data);
    } catch (error) {
      console.error('Error loading fields:', error);
      setMessage('Failed to load available fields');
    }
  }, []);

  const loadFormData = useCallback(async (id) => {
    try {
      console.log("Loading form data for ID:", id);
      const response = await adminAPI.getFormById(id);
      const form = response.data.data;
      console.log("Form loaded:", form);
      setFormName(form.formName);
      setSchoolName(form.schoolName);
      setSchoolAddress(form.schoolAddress || '');
      setSelectedFields(form.selectedFields || []);
    } catch (error) {
      console.error('Error loading form:', error);
      setMessage('Failed to load form data');
    }
  }, []);

  useEffect(() => {
    loadAvailableFields();
  }, [loadAvailableFields]);

  useEffect(() => {
    if (formId) {
      console.log("FormBuilder received formId:", formId);
      loadFormData(formId);
    } else {
      // Reset form for new creation
      setFormName('');
      setSchoolName('');
      setSchoolAddress('');
      setSelectedFields([]);
    }
  }, [formId, loadFormData]);

  const handleFieldToggle = (fieldName) => {
    const exists = selectedFields.find(f => f.fieldName === fieldName);
    
    if (exists) {
      setSelectedFields(selectedFields.filter(f => f.fieldName !== fieldName));
    } else {
      setSelectedFields([
        ...selectedFields,
        {
          fieldName,
          isRequired: false,
          order: selectedFields.length + 1
        }
      ]);
    }
  };

  const handleFieldUpdate = (fieldName, updates) => {
    setSelectedFields(
      selectedFields.map(field =>
        field.fieldName === fieldName ? { ...field, ...updates } : field
      )
    );
  };

  const handleReorder = (fromIndex, toIndex) => {
    const reordered = [...selectedFields];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    
    setSelectedFields(
      reordered.map((field, index) => ({
        ...field,
        order: index + 1
      }))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const formData = {
        formName,
        schoolName,
        schoolAddress,
        selectedFields: selectedFields.map((field, index) => ({
          ...field,
          order: index + 1
        }))
      };

      if (formId) {
        console.log("Updating form:", formId);
        await adminAPI.updateForm(formId, formData);
        setMessage('Form updated successfully!');
      } else {
        console.log("Creating new form");
        await adminAPI.createForm(formData);
        setMessage('Form created successfully!');
      }

      // Reset form and call onSave after a brief delay to show success message
      setTimeout(() => {
        if (onSave) {
          onSave();
        }
      }, 1000);
    } catch (error) {
      console.error('Error saving form:', error);
      setMessage(error.response?.data?.message || 'Failed to save form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-builder">
      <h2>{formId ? 'Edit Form' : 'Create New Form'}</h2>
      
      {message && (
        <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="form-group">
            <label>Form Name *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Student Registration Form"
              required
            />
          </div>

          <div className="form-group">
            <label>School Name *</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="e.g., Delhi Public School"
              required
            />
          </div>

          <div className="form-group">
            <label>School Address (for ID Card)</label>
            <input
              type="text"
              value={schoolAddress}
              onChange={(e) => setSchoolAddress(e.target.value)}
              placeholder="e.g., Main Road, City - 123456"
            />
          </div>
        </div>

        <FieldSelector
          availableFields={availableFields}
          selectedFields={selectedFields}
          onFieldToggle={handleFieldToggle}
          onFieldUpdate={handleFieldUpdate}
          onReorder={handleReorder}
        />

        <div className="form-actions">
          <button type="submit" disabled={loading || selectedFields.length === 0}>
            {loading ? 'Saving...' : (formId ? 'Update Form' : 'Create Form')}
          </button>
        </div>
      </form>

      {selectedFields.length > 0 && (
        <FormPreview
          formName={formName}
          schoolName={schoolName}
          selectedFields={selectedFields}
          availableFields={availableFields}
        />
      )}
    </div>
  );
};

export default FormBuilder;
