import React, { useState, useEffect } from 'react';
import '../../styles/IDCardSettings.css';

const IDCardSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // Track which image is being processed
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${apiUrl}/admin/id-card-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSettings(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('bgImageInput');
    const file = fileInput?.files[0];
    
    if (!file) {
      setError('Please select an image file');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a JPG, PNG, or WebP image');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('adminToken');
      
      const formData = new FormData();
      formData.append('backgroundImage', file);

      const response = await fetch(`${apiUrl}/admin/id-card-settings/background`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
        setSuccess('Background image uploaded successfully!');
        fileInput.value = '';
      } else {
        setError(data.message || 'Failed to upload image');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload image: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleApplyBackground = async (imageId) => {
    setActionLoading(imageId);
    setError('');
    setSuccess('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('adminToken');

      const response = await fetch(`${apiUrl}/admin/id-card-settings/background/${imageId}/activate`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
        setSuccess('Background applied to all ID cards!');
      } else {
        setError(data.message || 'Failed to apply background');
      }
    } catch (err) {
      console.error('Apply error:', err);
      setError('Failed to apply background: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteBackground = async (imageId) => {
    if (!window.confirm('Are you sure you want to delete this background image?')) {
      return;
    }

    setActionLoading(imageId);
    setError('');
    setSuccess('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('adminToken');

      const response = await fetch(`${apiUrl}/admin/id-card-settings/background/${imageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
        setSuccess('Background image deleted successfully!');
      } else {
        setError(data.message || 'Failed to delete image');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete image: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearActive = async () => {
    if (!window.confirm('Remove background from all ID cards?')) {
      return;
    }

    setActionLoading('clear');
    setError('');
    setSuccess('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('adminToken');

      const response = await fetch(`${apiUrl}/admin/id-card-settings/background/active/clear`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
        setSuccess('Background removed from ID cards');
      } else {
        setError(data.message || 'Failed to clear background');
      }
    } catch (err) {
      console.error('Clear error:', err);
      setError('Failed to clear background: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Get the active background image
  const getActiveBackground = () => {
    if (!settings?.activeBackgroundId || !settings?.backgroundImages?.length) return null;
    return settings.backgroundImages.find(img => img._id === settings.activeBackgroundId);
  };

  if (loading) {
    return (
      <div className="id-card-settings">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  const activeBackground = getActiveBackground();
  const backgroundImages = settings?.backgroundImages || [];

  return (
    <div className="id-card-settings">
      <div className="settings-header">
        <h1>🎨 ID Card Background Settings</h1>
        <p className="subtitle">Upload and manage background images for ID cards</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="settings-layout">
        {/* Upload Section */}
        <div className="upload-section">
          <h3>📤 Upload New Background</h3>
          <p className="upload-info">
            Recommended size: 340 x 220 pixels<br/>
            Formats: JPG, PNG, WebP | Max: 5MB
          </p>
          
          <form onSubmit={handleUpload} className="upload-form">
            <div className="file-input-wrapper">
              <input
                type="file"
                id="bgImageInput"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
              />
              <label htmlFor="bgImageInput" className="file-input-label">
                📁 Choose Image
              </label>
            </div>
            
            <button 
              type="submit" 
              className="upload-btn"
              disabled={uploading}
            >
              {uploading ? '⏳ Uploading...' : '📤 Upload'}
            </button>
          </form>
        </div>

        {/* Active Background Preview */}
        <div className="active-preview-section">
          <h3>✅ Currently Active Background</h3>
          
          <div className="active-preview">
            {activeBackground ? (
              <>
               <div 
                      className="preview-card"
                      style={{
                        backgroundImage: `url(${activeBackground.url})`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    >

                  <div className="preview-overlay">
                    <span className="active-badge">ACTIVE</span>
                  </div>
                </div>
                <p className="active-filename">{activeBackground.filename || 'Background Image'}</p>
                <button 
                  className="clear-active-btn"
                  onClick={handleClearActive}
                  disabled={actionLoading === 'clear'}
                >
                  {actionLoading === 'clear' ? '⏳ Removing...' : '🚫 Remove from ID Cards'}
                </button>
              </>
            ) : (
              <div className="no-active-bg">
                <div className="preview-card empty-preview">
                  <span>No background applied</span>
                </div>
                <p>Select a background from the gallery below to apply</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Background Gallery */}
      <div className="gallery-section">
        <h3>🖼️ Background Gallery ({backgroundImages.length} images)</h3>
        
        {backgroundImages.length === 0 ? (
          <div className="empty-gallery">
            <p>No background images uploaded yet</p>
            <p>Upload your first background image above</p>
          </div>
        ) : (
          <div className="background-gallery">
            {backgroundImages.map((image) => {
              const isActive = settings.activeBackgroundId === image._id;
              const isProcessing = actionLoading === image._id;
              
              return (
                <div 
                  key={image._id} 
                  className={`gallery-item ${isActive ? 'active' : ''}`}
                >
                    <div 
                      className="gallery-image"
                      style={{
                        backgroundImage: `url(${image.url})`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    >

                    {isActive && <span className="active-indicator">✓ Active</span>}
                  </div>
                  
                  <div className="gallery-item-info">
                    <p className="image-name">{image.filename || 'Background'}</p>
                    <p className="image-date">
                      {new Date(image.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="gallery-item-actions">
                    {!isActive && (
                      <button 
                        className="apply-btn"
                        onClick={() => handleApplyBackground(image._id)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? '⏳' : '✓ Apply'}
                      </button>
                    )}
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteBackground(image._id)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? '⏳' : '🗑️'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default IDCardSettings;
