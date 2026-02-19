import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Admin APIs
export const adminAPI = {
  createForm: (formData) => api.post('/admin/forms', formData),
  getAllForms: () => api.get('/admin/forms'),
  getFormById: (id) => api.get(`/admin/forms/${id}`),
  updateForm: (id, formData) => api.put(`/admin/forms/${id}`, formData),
  deleteForm: (id) => api.delete(`/admin/forms/${id}`),
  getAvailableFields: () => api.get('/admin/fields/available'),
};

// Public APIs
export const formAPI = {
  getAllForms: () => api.get('/admin/forms'), // Get all available forms for public display
  getFormStructure: (formId) => api.get(`/forms/${formId}/structure`),
  submitForm: (formId, formData) => {
    // If formData is FormData object (contains files), don't set Content-Type
    if (formData instanceof FormData) {
      return api.post(`/forms/${formId}/submit`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    }
    return api.post(`/forms/${formId}/submit`, formData);
  },
  getSubmissions: (formId) => api.get(`/forms/${formId}/submissions`),
};

export default api;
