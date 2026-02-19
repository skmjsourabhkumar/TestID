import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formAPI } from '../../services/api';
import '../../styles/PublicFormsList.css';

const PublicFormsList = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      setLoading(true);
      const response = await formAPI.getAllForms();
      setForms(response.data.data || []);
      setError('');
    } catch (err) {
      console.error('Error loading forms:', err);
      setError('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="forms-container"><p>Loading forms...</p></div>;
  }

  if (error) {
    return <div className="forms-container error"><p>{error}</p></div>;
  }

  return (
    <div className="forms-container">
      <h2>Available Forms</h2>
      {forms.length === 0 ? (
        <p>No forms available at the moment.</p>
      ) : (
        <div className="forms-grid">
          {forms.map(form => (
            <div key={form._id} className="form-card">
              <h3>{form.formName}</h3>
              <p className="school-name">{form.schoolName}</p>
              <p className="field-count">
                {form.selectedFields.length} field{form.selectedFields.length !== 1 ? 's' : ''}
              </p>
              <Link to={`/form/${form._id}`} className="form-link-btn">
                Fill Form
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicFormsList;
