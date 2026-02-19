import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import '../../styles/SubmissionsViewer.css';

const SubmissionsViewer = () => {
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('adminToken');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
      
      const response = await fetch(`${apiUrl}/forms/schools/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch schools');
      const data = await response.json();
      
      if (data.success && data.data) {
        setSchools(data.data.map(s => s.schoolName));
      }
    } catch (err) {
      console.error('Error loading schools:', err);
      setError('Failed to load schools: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissionsBySchool = async (schoolName) => {
    try {
      setLoading(true);
      setError('');
      setSelectedSchool(schoolName);
      
      const token = localStorage.getItem('adminToken');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
      
      const response = await fetch(`${apiUrl}/forms/school/${encodeURIComponent(schoolName)}/submissions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch submissions');
      const data = await response.json();
      
      if (data.success && data.data) {
        setSubmissions(data.data);
      } else {
        setSubmissions([]);
      }
    } catch (err) {
      console.error('Error loading submissions:', err);
      setError('Failed to load submissions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };;

  const handleEdit = (submission) => {
    console.log('Edit clicked for submission:', submission);
    setEditingId(submission._id);
    setEditData({ ...submission.submissionData });
  };

  const handleInputChange = (key, value) => {
    setEditData({
      ...editData,
      [key]: value,
    });
  };

  const handleSaveEdit = async (submissionId) => {
    try {
      console.log('Saving submission:', submissionId, 'with data:', editData);
      const token = localStorage.getItem('adminToken');
      const submission = submissions.find(s => s._id === submissionId);
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
      
      const response = await fetch(
        `${apiUrl}/forms/${submission.formId || 'unknown'}/submissions/${submissionId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ submissionData: editData }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Error updating submission');
        return;
      }

      // Update local state
      setSubmissions(
        submissions.map((sub) =>
          sub._id === submissionId ? { ...sub, submissionData: editData } : sub
        )
      );
      setEditingId(null);
      setEditData({});
      alert('Submission updated successfully!');
    } catch (err) {
      setError('Failed to update submission');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (submissionId) => {
    if (!window.confirm('Are you sure you want to delete this submission?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const submission = submissions.find(s => s._id === submissionId);
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
      
      const response = await fetch(
        `${apiUrl}/forms/${submission.formId || 'unknown'}/submissions/${submissionId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Error deleting submission');
        return;
      }

      setSubmissions(submissions.filter((sub) => sub._id !== submissionId));
      alert('Submission deleted successfully!');
    } catch (err) {
      setError('Failed to delete submission');
      console.error('Error:', err);
    }
  };

  return (
    <div className="submissions-viewer">
      <div className="viewer-container">
        {/* Schools List */}
        <div className="schools-list-panel">
          <h2>Schools</h2>
          {loading && !selectedSchool && <p className="loading">Loading schools...</p>}
          {error && <div className="error-message">{error}</div>}
          
          {schools.length === 0 && !loading ? (
            <p className="no-data">No schools found</p>
          ) : (
            <ul className="schools-list">
              {schools.map((school) => (
                <li
                  key={school}
                  className={`school-item ${selectedSchool === school ? 'active' : ''}`}
                  onClick={() => fetchSubmissionsBySchool(school)}
                >
                  {school}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Submissions List */}
        <div className="submissions-panel">
          {selectedSchool ? (
            <>
              <div className="panel-header">
                <h2>Submissions - {selectedSchool}</h2>
                <button className="back-btn" onClick={() => setSelectedSchool(null)}>
                  ← Back to Schools
                </button>
              </div>

              {loading && <p className="loading">Loading submissions...</p>}
              
              {submissions.length === 0 && !loading ? (
                <p className="no-data">No submissions found for this school</p>
              ) : (
                <div className="submissions-grid">
                  {submissions.map((submission) => (
                    <div key={submission._id} className="submission-card">
                      <div className="card-header">
                        <h3>{submission.formName}</h3>
                        <p className="submission-date">
                          {new Date(submission.submittedAt || submission.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="card-content">
                        {editingId === submission._id ? (
                          <div className="edit-form">
                            {Object.entries(editData).map(([key, value]) => {
                              if (typeof value === 'object' || key === 'photo') return null;
                              return (
                                <div key={key} className="form-group">
                                  <label>{key}</label>
                                  <input
                                    type="text"
                                    value={String(value || '')}
                                    onChange={(e) => handleInputChange(key, e.target.value)}
                                  />
                                </div>
                              );
                            })}
                            <div className="edit-actions">
                              <button
                                className="save-btn"
                                onClick={() => handleSaveEdit(submission._id)}
                              >
                                Save Changes
                              </button>
                              <button
                                className="cancel-btn"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditData({});
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="data-display">
                              {submission.submissionData && Object.entries(submission.submissionData).map(
                                ([key, value]) => {
                                  if (typeof value === 'object' || key === 'photo') return null;
                                  return (
                                    <div key={key} className="data-item">
                                      <strong>{key}:</strong>
                                      <span>{String(value || '')}</span>
                                    </div>
                                  );
                                }
                              )}
                            </div>
                            <div className="card-actions">
                              <button
                                className="edit-btn"
                                onClick={() => handleEdit(submission)}
                              >
                                Edit
                              </button>
                              <button
                                className="delete-btn"
                                onClick={() => handleDelete(submission._id)}
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <p>Select a school to view submissions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionsViewer;
