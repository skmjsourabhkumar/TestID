import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';

const FormList = ({ onEdit }) => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadForms = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getAllForms();
      console.log("Forms loaded:", response.data);
      setForms(response.data.data || []);
    } catch (err) {
      console.error('Error loading forms:', err);
      setError('Failed to load forms');
      setForms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this form?')) {
      try {
        console.log("Deleting form:", id);
        await adminAPI.deleteForm(id);
        console.log("Form deleted successfully");
        setError('');
        // Refresh the list after deletion
        await loadForms();
      } catch (err) {
        console.error('Error deleting form:', err);
        setError(err.response?.data?.message || 'Failed to delete form');
      }
    }
  };

  const handleEdit = (id) => {
    console.log("Edit clicked for form:", id);
    onEdit(id);
  };

  if (loading) return <div className="loading">Loading forms...</div>;

  return (
    <div className="form-list">
      <h2>All Forms</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      {forms.length === 0 ? (
        <p>No forms created yet. Click "Create New Form" to get started!</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Form Name</th>
              <th>School Name</th>
              <th>Fields Count</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {forms.map((form) => (
              <tr key={form._id}>
                <td>{form.formName}</td>
                <td>{form.schoolName}</td>
                <td>{form.selectedFields?.length || 0}</td>
                <td>{new Date(form.createdAt).toLocaleDateString()}</td>
                <td>
                  <button 
                    className="btn-edit"
                    onClick={() => handleEdit(form._id)}
                    title="Edit form"
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => handleDelete(form._id)}
                    title="Delete form"
                  >
                    Delete
                  </button>
                  <button 
                    className="btn-view"
                    onClick={() => window.open(`/form/${form._id}`, '_blank')}
                    title="View form"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default FormList;
