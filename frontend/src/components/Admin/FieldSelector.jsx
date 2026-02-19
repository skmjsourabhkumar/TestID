import React from 'react';

const FieldSelector = ({ 
  availableFields, 
  selectedFields, 
  onFieldToggle, 
  onFieldUpdate,
  onReorder 
}) => {
  const isSelected = (fieldName) => {
    return selectedFields.some(f => f.fieldName === fieldName);
  };

  const getFieldConfig = (fieldName) => {
    return selectedFields.find(f => f.fieldName === fieldName);
  };

  return (
    <div className="field-selector">
      <h3>Select Form Fields</h3>
      
      <div className="available-fields">
        {Object.entries(availableFields).map(([fieldName, fieldDef]) => {
          const selected = isSelected(fieldName);
          const config = getFieldConfig(fieldName);

          return (
            <div key={fieldName} className={`field-item ${selected ? 'selected' : ''}`}>
              <div className="field-header">
                <label>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onFieldToggle(fieldName)}
                  />
                  <span className="field-label">{fieldDef.label}</span>
                </label>
                
                {selected && (
                  <label className="required-checkbox">
                    <input
                      type="checkbox"
                      checked={config?.isRequired}
                      onChange={(e) => onFieldUpdate(fieldName, { 
                        isRequired: e.target.checked 
                      })}
                    />
                    <span>Required</span>
                  </label>
                )}
              </div>

              {selected && (
                <div className="field-info">
                  <span className="field-type">Type: {fieldDef.type}</span>
                  <span className="field-order">Order: {config?.order}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedFields.length > 0 && (
        <div className="selected-fields-order">
          <h4>Field Order (Drag to reorder)</h4>
          <div className="fields-list">
            {selectedFields
              .sort((a, b) => a.order - b.order)
              .map((field, index) => (
                <div key={field.fieldName} className="order-item">
                  <span className="order-number">{index + 1}</span>
                  <span className="field-name">
                    {availableFields[field.fieldName]?.label}
                  </span>
                  <span className="required-badge">
                    {field.isRequired && '(Required)'}
                  </span>
                  <div className="order-controls">
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => onReorder(index, index - 1)}
                      >
                        ↑
                      </button>
                    )}
                    {index < selectedFields.length - 1 && (
                      <button
                        type="button"
                        onClick={() => onReorder(index, index + 1)}
                      >
                        ↓
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldSelector;
