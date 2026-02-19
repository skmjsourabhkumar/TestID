import React from 'react';

const FormPreview = ({ formName, schoolName, selectedFields, availableFields }) => {
  const sortedFields = [...selectedFields].sort((a, b) => a.order - b.order);

  return (
    <div className="form-preview">
      <h3>Form Preview</h3>
      <div className="preview-container">
        <div className="preview-header">
          <h2>{schoolName}</h2>
          <h3>{formName}</h3>
        </div>

        <form className="preview-form">
          {sortedFields.map((field) => {
            const fieldDef = availableFields[field.fieldName];
            
            return (
              <div key={field.fieldName} className="preview-field">
                <label>
                  {fieldDef?.label}
                  {field.isRequired && <span className="required">*</span>}
                </label>
                
                {fieldDef?.type === 'select' ? (
                  <select disabled>
                    <option>Select {fieldDef.label}</option>
                    {fieldDef.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : fieldDef?.type === 'textarea' ? (
                  <textarea 
                    placeholder={`Enter ${fieldDef.label}`}
                    disabled
                  />
                ) : (
                  <input
                    type={fieldDef?.type || 'text'}
                    placeholder={`Enter ${fieldDef.label}`}
                    disabled
                  />
                )}
              </div>
            );
          })}
          
          <button type="button" disabled className="preview-submit">
            Submit (Preview Mode)
          </button>
        </form>
      </div>
    </div>
  );
};

export default FormPreview;
