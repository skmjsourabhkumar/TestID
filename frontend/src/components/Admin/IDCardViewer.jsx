import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../../styles/IDCardViewer.css';

const IDCardViewer = () => {
  const [schools, setSchools] = useState([]);
  const [formConfigs, setFormConfigs] = useState({}); // Store form configs by school name
  const [formConfigsById, setFormConfigsById] = useState({}); // Store form configs by ID
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCards, setSelectedCards] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [exporting, setExporting] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState(null);
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Export options modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    layout: '2x4', // '2x4' (8 cards/page), '2x3' (6 cards/page), '1x1' (1 card/page)
    quality: 'high', // 'standard', 'high', 'print'
    includeBleed: false,
    includeCropMarks: false,
    pageSize: 'a4' // 'a4', 'a3', 'letter'
  });
  const [exportProgress, setExportProgress] = useState(0);
  
  // Filters
  const [filters, setFilters] = useState({
    schoolName: '',
    className: '',
    studentName: '',
    section: ''
  });

  // Available filter options
  const [filterOptions, setFilterOptions] = useState({
    schools: [],
    classes: [],
    sections: []
  });

  const cardRefs = useRef({});

  useEffect(() => {
    fetchAllData();
    fetchBackgroundImage();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, submissions]);

  useEffect(() => {
    // Update filter options based on submissions
    const schoolSet = new Set();
    const classSet = new Set();
    const sectionSet = new Set();

    submissions.forEach(sub => {
      if (sub.schoolName) schoolSet.add(sub.schoolName);
      if (sub.submissionData?.class) classSet.add(sub.submissionData.class);
      if (sub.submissionData?.section) sectionSet.add(sub.submissionData.section);
    });

    setFilterOptions({
      schools: Array.from(schoolSet).sort(),
      classes: Array.from(classSet).sort(),
      sections: Array.from(sectionSet).sort()
    });
  }, [submissions]);

  const fetchBackgroundImage = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      
      const response = await fetch(`${apiUrl}/admin/id-card-settings`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Get active background from the array
          const settings = data.data;
          if (settings.activeBackgroundId && settings.backgroundImages?.length) {
            const activeImg = settings.backgroundImages.find(
              img => img._id === settings.activeBackgroundId
            );
            if (activeImg?.url) {
              setBackgroundImage(activeImg.url);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching background image:', err);
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('adminToken');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      
      // Fetch all form configurations (to get fields per school)
      const formsResponse = await fetch(`${apiUrl}/admin/forms`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (formsResponse.ok) {
        const formsData = await formsResponse.json();
        if (formsData.success && formsData.data) {
          // Create a map of schoolName -> selectedFields
          const configMap = {};
          const configByIdMap = {};
          formsData.data.forEach(form => {
            configMap[form.schoolName] = form.selectedFields.map(f => f.fieldName);
            configByIdMap[form._id] = form;
          });
          setFormConfigs(configMap);
          setFormConfigsById(configByIdMap);
        }
      }
      
      // Fetch all schools
      const schoolsResponse = await fetch(`${apiUrl}/forms/schools/all`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!schoolsResponse.ok) throw new Error('Failed to fetch schools');
      const schoolsData = await schoolsResponse.json();
      
      if (schoolsData.success && schoolsData.data) {
        setSchools(schoolsData.data);
        
        // Fetch submissions for all schools
        const allSubmissions = [];
        for (const school of schoolsData.data) {
          const subResponse = await fetch(
            `${apiUrl}/forms/school/${encodeURIComponent(school.schoolName)}/submissions`,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          if (subResponse.ok) {
            const subData = await subResponse.json();
            if (subData.success && subData.data) {
              allSubmissions.push(...subData.data);
            }
          }
        }
        
        setSubmissions(allSubmissions);
        setFilteredSubmissions(allSubmissions);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...submissions];

    if (filters.schoolName) {
      result = result.filter(sub => 
        sub.schoolName?.toLowerCase().includes(filters.schoolName.toLowerCase())
      );
    }

    if (filters.className) {
      result = result.filter(sub => 
        sub.submissionData?.class?.toLowerCase().includes(filters.className.toLowerCase())
      );
    }

    if (filters.studentName) {
      result = result.filter(sub => 
        sub.submissionData?.name?.toLowerCase().includes(filters.studentName.toLowerCase())
      );
    }

    if (filters.section) {
      result = result.filter(sub => 
        sub.submissionData?.section?.toLowerCase().includes(filters.section.toLowerCase())
      );
    }

    setFilteredSubmissions(result);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      schoolName: '',
      className: '',
      studentName: '',
      section: ''
    });
  };

  const toggleCardSelection = (id) => {
    setSelectedCards(prev => 
      prev.includes(id) 
        ? prev.filter(cardId => cardId !== id)
        : [...prev, id]
    );
  };

  const selectAllCards = () => {
    if (selectedCards.length === filteredSubmissions.length) {
      setSelectedCards([]);
    } else {
      setSelectedCards(filteredSubmissions.map(sub => sub._id));
    }
  };

  // Get quality scale based on option
  const getQualityScale = () => {
    switch (exportOptions.quality) {
      case 'print': return 4; // 300+ DPI
      case 'high': return 3; // ~200 DPI
      default: return 2; // ~150 DPI
    }
  };

  // Get layout configuration
  const getLayoutConfig = () => {
    const configs = {
      '2x4': { rows: 3, cols: 3, cardsPerPage: 9 }, // 3x3 for portrait cards on A4
      '2x3': { rows: 3, cols: 2, cardsPerPage: 6 },
      '3x4': { rows: 3, cols: 4, cardsPerPage: 12 },
      '1x1': { rows: 1, cols: 1, cardsPerPage: 1 }
    };
    return configs[exportOptions.layout] || configs['2x4'];
  };

  // Get page dimensions
  const getPageDimensions = () => {
    const dimensions = {
      'a4': { width: 210, height: 297 },
      'a3': { width: 297, height: 420 },
      'letter': { width: 216, height: 279 }
    };
    return dimensions[exportOptions.pageSize] || dimensions['a4'];
  };

  // Draw crop marks on PDF
  const drawCropMarks = (pdf, x, y, width, height) => {
    const markLength = 5;
    const offset = 2;
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.1);
    
    // Top-left
    pdf.line(x - offset - markLength, y, x - offset, y);
    pdf.line(x, y - offset - markLength, x, y - offset);
    
    // Top-right
    pdf.line(x + width + offset, y, x + width + offset + markLength, y);
    pdf.line(x + width, y - offset - markLength, x + width, y - offset);
    
    // Bottom-left
    pdf.line(x - offset - markLength, y + height, x - offset, y + height);
    pdf.line(x, y + height + offset, x, y + height + offset + markLength);
    
    // Bottom-right
    pdf.line(x + width + offset, y + height, x + width + offset + markLength, y + height);
    pdf.line(x + width, y + height + offset, x + width, y + height + offset + markLength);
  };

  // Export to PDF with advanced options
  const exportToPDF = async (submissionsToExport) => {
    if (submissionsToExport.length === 0) {
      alert('Please select at least one ID card to export');
      return;
    }

    setExporting(true);
    setExportProgress(0);
    
    try {
      const pageDim = getPageDimensions();
      const layoutConfig = getLayoutConfig();
      const qualityScale = getQualityScale();
      
      const pdf = new jsPDF('p', 'mm', [pageDim.width, pageDim.height]);
      
      // Portrait ID card dimensions (matching our card design)
      const cardWidth = 54; // mm (portrait width)
      const cardHeight = 84; // mm (portrait height)
      const bleed = exportOptions.includeBleed ? 3 : 0;
      
      // Calculate margins to center cards on page
      const gapX = layoutConfig.cols > 1 ? 8 : 0;
      const gapY = layoutConfig.rows > 1 ? 10 : 0;
      
      const totalCardWidth = (cardWidth + bleed * 2) * layoutConfig.cols + (gapX * (layoutConfig.cols - 1));
      const totalCardHeight = (cardHeight + bleed * 2) * layoutConfig.rows + (gapY * (layoutConfig.rows - 1));
      
      const marginX = (pageDim.width - totalCardWidth) / 2;
      const marginY = (pageDim.height - totalCardHeight) / 2;

      let cardIndex = 0;

      for (const submission of submissionsToExport) {
        const cardElement = cardRefs.current[submission._id];
        if (!cardElement) continue;

        // Update progress
        setExportProgress(Math.round((cardIndex / submissionsToExport.length) * 100));

        // Hide action buttons before capture
        const actionButtons = cardElement.querySelector('.card-action-buttons');
        if (actionButtons) actionButtons.style.display = 'none';

        const canvas = await html2canvas(cardElement, {
          scale: qualityScale,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: cardElement.offsetWidth,
          height: cardElement.offsetHeight,
          onclone: (clonedDoc, element) => {
            // Ensure styles are applied in cloned document
            element.style.boxShadow = 'none';
            element.style.transform = 'none';
          }
        });

        // Restore action buttons
        if (actionButtons) actionButtons.style.display = '';

        const imgData = canvas.toDataURL('image/png', 1.0);
        
        const positionOnPage = cardIndex % layoutConfig.cardsPerPage;
        const row = Math.floor(positionOnPage / layoutConfig.cols);
        const col = positionOnPage % layoutConfig.cols;
        
        const x = marginX + (col * (cardWidth + bleed * 2 + gapX));
        const y = marginY + (row * (cardHeight + bleed * 2 + gapY));

        if (cardIndex > 0 && positionOnPage === 0) {
          pdf.addPage();
        }

        // Add card image with proper aspect ratio
        pdf.addImage(imgData, 'PNG', x + bleed, y + bleed, cardWidth, cardHeight);
        
        // Draw crop marks if enabled
        if (exportOptions.includeCropMarks) {
          drawCropMarks(pdf, x + bleed, y + bleed, cardWidth, cardHeight);
        }
        
        cardIndex++;
      }

      // Generate filename with date and options
      const date = new Date().toISOString().split('T')[0];
      const schoolName = filters.schoolName || 'All-Schools';
      const qualityLabel = exportOptions.quality === 'print' ? '-PrintReady' : '';
      pdf.save(`ID-Cards-${schoolName}-${date}${qualityLabel}.pdf`);
      
      setExportProgress(100);
      alert(`✅ Successfully exported ${submissionsToExport.length} ID card(s) to PDF\n\n📄 Layout: ${exportOptions.layout} (${layoutConfig.cardsPerPage} cards/page)\n🎨 Quality: ${exportOptions.quality}\n📐 Page Size: ${exportOptions.pageSize.toUpperCase()}`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      setError('Failed to export PDF: ' + err.message);
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };

  // Handle export - PDF only
  const handleExport = () => {
    const submissionsToExport = selectedCards.length > 0
      ? filteredSubmissions.filter(sub => selectedCards.includes(sub._id))
      : filteredSubmissions;

    exportToPDF(submissionsToExport);
    setExportModalOpen(false);
  };

  // Open export modal
  const openExportModal = () => {
    setExportModalOpen(true);
  };

  const exportSelectedToPDF = () => {
    const selectedSubmissions = filteredSubmissions.filter(sub => 
      selectedCards.includes(sub._id)
    );
    exportToPDF(selectedSubmissions);
  };

  const exportAllToPDF = () => {
    exportToPDF(filteredSubmissions);
  };

  const getPhotoUrl = (submission) => {
    const photo = submission.submissionData?.photo;
    if (photo?.url) return photo.url;
    if (typeof photo === 'string') return photo;
    return '/default-avatar.png';
  };

  // Group submissions by school
  const groupedBySchool = filteredSubmissions.reduce((acc, sub) => {
    const school = sub.schoolName || 'Unknown School';
    if (!acc[school]) acc[school] = [];
    acc[school].push(sub);
    return acc;
  }, {});

  // Get the fields configured for a specific school
  const getSchoolFields = (schoolName) => {
    return formConfigs[schoolName] || [];
  };

  // Check if a field should be displayed for this school
  const hasField = (schoolName, fieldName) => {
    const fields = getSchoolFields(schoolName);
    return fields.includes(fieldName);
  };

  // Get field value from submission data
  const getFieldValue = (submission, fieldName) => {
    const data = submission.submissionData || {};
    switch (fieldName) {
      case 'name':
        return data.name || '';
      case 'fatherName':
        return data.fatherName || '';
      case 'motherName':
        return data.motherName || '';
      case 'class':
        return data.class || '';
      case 'section':
        return data.section || '';
      case 'roleNumber':
        return data.roleNumber || data.rollNumber || '';
      case 'admissionNumber':
        return data.admissionNumber || '';
      case 'dateOfBirth':
        return data.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString() : '';
      case 'bloodGroup':
        return data.bloodGroup || '';
      case 'mobileNumber':
        return data.mobileNumber || '';
      case 'address':
        return data.address || '';
      case 'aadhaarNumber':
        return data.aadhaarNumber || '';
      case 'stream':
        return data.stream || '';
      case 'session':
        return data.session || '';
      case 'email':
        return data.email || '';
      default:
        return data[fieldName] || '';
    }
  };

  // Get display label for a field
  const getFieldLabel = (fieldName) => {
    const labels = {
      name: 'Name',
      fatherName: "Father's Name",
      motherName: "Mother's Name",
      class: 'Class',
      section: 'Section',
      roleNumber: 'Roll No',
      admissionNumber: 'Adm No',
      dateOfBirth: 'DOB',
      bloodGroup: 'Blood Group',
      mobileNumber: 'Mobile',
      address: 'Address',
      aadhaarNumber: 'Aadhaar',
      stream: 'Stream',
      session: 'Session',
      email: 'Email'
    };
    return labels[fieldName] || fieldName;
  };

  // Handle Edit button click
  const handleEditClick = (e, submission) => {
    e.stopPropagation(); // Prevent card selection
    setEditingSubmission(submission);
    setEditFormData(submission.submissionData || {});
    setEditModalOpen(true);
  };

  // Handle Delete button click
  const handleDeleteClick = async (e, submission) => {
    e.stopPropagation(); // Prevent card selection
    
    if (!window.confirm(`Are you sure you want to delete the ID card for "${submission.submissionData?.name || 'this student'}"?`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('adminToken');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      
      const response = await fetch(
        `${apiUrl}/forms/${submission.formConfigId}/submissions/${submission._id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.ok) {
        // Remove from local state
        setSubmissions(prev => prev.filter(s => s._id !== submission._id));
        setSelectedCards(prev => prev.filter(id => id !== submission._id));
        alert('ID card deleted successfully');
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete');
      }
    } catch (err) {
      console.error('Error deleting submission:', err);
      setError('Failed to delete ID card: ' + err.message);
    }
  };

  // Handle edit form field change
  const handleEditFieldChange = (fieldName, value) => {
    setEditFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Save edited submission
  const handleSaveEdit = async () => {
    if (!editingSubmission) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      
      const response = await fetch(
        `${apiUrl}/forms/${editingSubmission.formConfigId}/submissions/${editingSubmission._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ submissionData: editFormData })
        }
      );
      
      if (response.ok) {
        // Update local state
        setSubmissions(prev => prev.map(s => 
          s._id === editingSubmission._id 
            ? { ...s, submissionData: editFormData }
            : s
        ));
        setEditModalOpen(false);
        setEditingSubmission(null);
        setEditFormData({});
        alert('ID card updated successfully');
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update');
      }
    } catch (err) {
      console.error('Error updating submission:', err);
      setError('Failed to update ID card: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Close edit modal
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingSubmission(null);
    setEditFormData({});
  };

  // Render a single professional ID card - clean design for custom backgrounds
  const renderIDCard = (submission, schoolName) => {
    const fields = getSchoolFields(schoolName);
    const hasPhoto = fields.includes('photo');
    const data = submission.submissionData || {};
    
    // Get form config for this submission to get school address if available
    const formConfig = formConfigsById[submission.formConfigId];
    
    return (
      <div 
        className="id-card professional-card"
        ref={el => cardRefs.current[submission._id] = el}
        style={backgroundImage ? {
          backgroundImage: `url(${backgroundImage})`
        } : {}}
      >
        {/* Action buttons */}
        <div className="card-action-buttons">
          <button 
            className="card-edit-btn"
            onClick={(e) => handleEditClick(e, submission)}
            title="Edit ID Card"
          >
            ✏️
          </button>
          <button 
            className="card-delete-btn"
            onClick={(e) => handleDeleteClick(e, submission)}
            title="Delete ID Card"
          >
            🗑️
          </button>
        </div>

        {/* Spacer for header area - school name is in background */}
        <div className="card-header-spacer"></div>

        {/* Photo Row - Stream left, Photo center, Blood+Session right */}
        <div className="card-photo-row">
          {/* Left side - Stream */}
          <div className="card-left-info">
            {hasField(schoolName, 'stream') && data.stream && (
              <div className="stream-info">
                <span className="stream-value-text">{data.stream}</span>
              </div>
            )}
          </div>
          
          {/* Center - Photo */}
          {hasPhoto && (
            <div className="card-photo-container">
              <img 
                src={getPhotoUrl(submission)} 
                alt="Student" 
                className="student-photo-img"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23ddd" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23999" font-size="14">Photo</text></svg>';
                }}
              />
            </div>
          )}
          
          {/* Right side - Blood Group and Session */}
          <div className="card-right-info">
            {hasField(schoolName, 'bloodGroup') && data.bloodGroup && (
              <div className="blood-group-badge">
                <span className="blood-value">{data.bloodGroup}</span>
              </div>
            )}
            {hasField(schoolName, 'session') && data.session && (
              <div className="session-info">
                <span className="session-value">{data.session}</span>
              </div>
            )}
          </div>
        </div>

        {/* Student Name - Prominent */}
        {hasField(schoolName, 'name') && (
          <div className="card-name-section">
            <h3 className="student-name-text">{data.name || 'Student Name'}</h3>
          </div>
        )}

        {/* Details Section - Dynamic Fields */}
        <div className="card-details-section">
          {/* First row - Class, Roll, Admission */}
          <div className="details-row compact-row">
            {hasField(schoolName, 'class') && data.class && (
              <div className="detail-item">
                <span className="detail-label">Class:</span>
                <span className="detail-value highlight">{data.class}{data.section ? `/${data.section}` : ''}</span>
              </div>
            )}
            {hasField(schoolName, 'roleNumber') && (data.roleNumber || data.rollNumber) && (
              <div className="detail-item">
                <span className="detail-label">Roll:</span>
                <span className="detail-value highlight">{data.roleNumber || data.rollNumber}</span>
              </div>
            )}
            {hasField(schoolName, 'admissionNumber') && data.admissionNumber && (
              <div className="detail-item">
                <span className="detail-label">Adm.:</span>
                <span className="detail-value highlight">{data.admissionNumber}</span>
              </div>
            )}
          </div>

          {/* Other fields in label-value format */}
          <div className="details-list">
            {hasField(schoolName, 'fatherName') && data.fatherName && (
              <div className="detail-row">
                <span className="detail-label">Father's Name</span>
                <span className="detail-separator">:-</span>
                <span className="detail-value">{data.fatherName}</span>
              </div>
            )}
            {hasField(schoolName, 'motherName') && data.motherName && (
              <div className="detail-row">
                <span className="detail-label">Mother's Name</span>
                <span className="detail-separator">:-</span>
                <span className="detail-value">{data.motherName}</span>
              </div>
            )}
            {hasField(schoolName, 'address') && data.address && (
              <div className="detail-row">
                <span className="detail-label">Address</span>
                <span className="detail-separator">:-</span>
                <span className="detail-value address-value">{data.address}</span>
              </div>
            )}
            {hasField(schoolName, 'dateOfBirth') && data.dateOfBirth && (
              <div className="detail-row">
                <span className="detail-label">Date of Birth</span>
                <span className="detail-separator">:-</span>
                <span className="detail-value">{new Date(data.dateOfBirth).toLocaleDateString('en-IN')}</span>
              </div>
            )}
            {hasField(schoolName, 'mobileNumber') && data.mobileNumber && (
              <div className="detail-row">
                <span className="detail-label">Contact No.</span>
                <span className="detail-separator">:-</span>
                <span className="detail-value">{data.mobileNumber}</span>
              </div>
            )}
            {hasField(schoolName, 'aadhaarNumber') && data.aadhaarNumber && (
              <div className="detail-row">
                <span className="detail-label">UID No.</span>
                <span className="detail-separator">:-</span>
                <span className="detail-value">{data.aadhaarNumber}</span>
              </div>
            )}
            {hasField(schoolName, 'email') && data.email && (
              <div className="detail-row">
                <span className="detail-label">Email</span>
                <span className="detail-separator">:-</span>
                <span className="detail-value">{data.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Section - Only stream badge if no background */}
        {!backgroundImage && hasField(schoolName, 'stream') && data.stream && (
          <div className="card-footer-section">
            <div className="footer-left">
              <div className="stream-badge">
                <span className="stream-label">Stream:</span>
                <span className="stream-value">{data.stream}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="id-card-viewer">
      <div className="viewer-header">
        <h1>🎓 ID Card Management</h1>
        <p className="subtitle">View, filter, and export student ID cards</p>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filters-header">
          <h3>🔍 Filters</h3>
          <button className="clear-filters-btn" onClick={clearFilters}>
            Clear All
          </button>
        </div>
        
        <div className="filters-grid">
          <div className="filter-group">
            <label>School Name</label>
            <select 
              value={filters.schoolName}
              onChange={(e) => handleFilterChange('schoolName', e.target.value)}
            >
              <option value="">All Schools</option>
              {filterOptions.schools.map(school => (
                <option key={school} value={school}>{school}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Class</label>
            <select 
              value={filters.className}
              onChange={(e) => handleFilterChange('className', e.target.value)}
            >
              <option value="">All Classes</option>
              {filterOptions.classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Section</label>
            <select 
              value={filters.section}
              onChange={(e) => handleFilterChange('section', e.target.value)}
            >
              <option value="">All Sections</option>
              {filterOptions.sections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Student Name</label>
            <input
              type="text"
              placeholder="Search by name..."
              value={filters.studentName}
              onChange={(e) => handleFilterChange('studentName', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Actions Section */}
      <div className="actions-section">
        <div className="stats">
          <span className="stat-item">
            📋 Total: <strong>{filteredSubmissions.length}</strong> cards
          </span>
          <span className="stat-item">
            ✅ Selected: <strong>{selectedCards.length}</strong>
          </span>
        </div>

        <div className="action-buttons">
          <button 
            className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            Grid View
          </button>
          <button 
            className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            School Groups
          </button>
          <button className="select-all-btn" onClick={selectAllCards}>
            {selectedCards.length === filteredSubmissions.length ? 'Deselect All' : 'Select All'}
          </button>
          <button 
            className="export-btn advanced-export-btn"
            onClick={openExportModal}
            disabled={filteredSubmissions.length === 0 || exporting}
          >
            {exporting ? `⏳ Exporting ${exportProgress}%...` : '📥 Export Options'}
          </button>
        </div>
      </div>

      {/* Export Progress Bar */}
      {exporting && exportProgress > 0 && (
        <div className="export-progress-container">
          <div className="export-progress-bar">
            <div 
              className="export-progress-fill" 
              style={{ width: `${exportProgress}%` }}
            />
          </div>
          <span className="export-progress-text">Exporting... {exportProgress}%</span>
        </div>
      )}

      {/* Error Message */}
      {error && <div className="error-message">{error}</div>}

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading ID cards...</p>
        </div>
      )}

      {/* ID Cards Display */}
      {!loading && viewMode === 'grid' && (
        <div className="id-cards-grid">
          {filteredSubmissions.length === 0 ? (
            <div className="empty-state">
              <p>No ID cards found matching your filters</p>
            </div>
          ) : (
            filteredSubmissions.map(submission => (
              <div 
                key={submission._id}
                className={`id-card-wrapper ${selectedCards.includes(submission._id) ? 'selected' : ''}`}
                onClick={() => toggleCardSelection(submission._id)}
              >
                {renderIDCard(submission, submission.schoolName)}
                <div className="selection-indicator">
                  {selectedCards.includes(submission._id) ? '✓' : ''}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Grouped by School View */}
      {!loading && viewMode === 'list' && (
        <div className="schools-grouped-view">
          {Object.keys(groupedBySchool).length === 0 ? (
            <div className="empty-state">
              <p>No ID cards found matching your filters</p>
            </div>
          ) : (
            Object.entries(groupedBySchool).map(([schoolName, schoolSubmissions]) => (
              <div key={schoolName} className="school-group">
                <div className="school-group-header">
                  <h2>🏫 {schoolName}</h2>
                  <span className="count-badge">{schoolSubmissions.length} students</span>
                  <span className="fields-badge">
                    Fields: {getSchoolFields(schoolName).length}
                  </span>
                  <button 
                    className="export-school-btn"
                    onClick={() => exportToPDF(schoolSubmissions)}
                    disabled={exporting}
                  >
                    📥 Export School
                  </button>
                </div>
                
                <div className="school-cards-grid">
                  {schoolSubmissions.map(submission => (
                    <div 
                      key={submission._id}
                      className={`id-card-wrapper ${selectedCards.includes(submission._id) ? 'selected' : ''}`}
                      onClick={() => toggleCardSelection(submission._id)}
                    >
                      {renderIDCard(submission, schoolName)}
                      <div className="selection-indicator">
                        {selectedCards.includes(submission._id) ? '✓' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && editingSubmission && (
        <div className="edit-modal-overlay" onClick={handleCloseEditModal}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h2>✏️ Edit ID Card</h2>
              <button className="close-modal-btn" onClick={handleCloseEditModal}>×</button>
            </div>
            <div className="edit-modal-body">
              <p className="edit-modal-subtitle">
                Editing: <strong>{editingSubmission.submissionData?.name || 'Student'}</strong>
              </p>
              <div className="edit-form-fields">
                {getSchoolFields(editingSubmission.schoolName)
                  .filter(f => f !== 'photo')
                  .map(fieldName => (
                    <div key={fieldName} className="edit-field-group">
                      <label>{getFieldLabel(fieldName)}</label>
                      {fieldName === 'address' ? (
                        <textarea
                          value={editFormData[fieldName] || ''}
                          onChange={(e) => handleEditFieldChange(fieldName, e.target.value)}
                          rows={3}
                        />
                      ) : fieldName === 'dateOfBirth' ? (
                        <input
                          type="date"
                          value={editFormData[fieldName] ? editFormData[fieldName].split('T')[0] : ''}
                          onChange={(e) => handleEditFieldChange(fieldName, e.target.value)}
                        />
                      ) : (
                        <input
                          type="text"
                          value={editFormData[fieldName] || ''}
                          onChange={(e) => handleEditFieldChange(fieldName, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
              </div>
            </div>
            <div className="edit-modal-footer">
              <button 
                className="cancel-edit-btn" 
                onClick={handleCloseEditModal}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                className="save-edit-btn" 
                onClick={handleSaveEdit}
                disabled={saving}
              >
                {saving ? '⏳ Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Options Modal */}
      {exportModalOpen && (
        <div className="edit-modal-overlay" onClick={() => setExportModalOpen(false)}>
          <div className="edit-modal export-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header export-modal-header">
              <h2>📥 Export Options</h2>
              <button className="close-modal-btn" onClick={() => setExportModalOpen(false)}>×</button>
            </div>
            <div className="edit-modal-body">
              <p className="edit-modal-subtitle">
                Exporting: <strong>{selectedCards.length > 0 ? `${selectedCards.length} selected` : `All ${filteredSubmissions.length}`}</strong> ID cards
              </p>
              
              <div className="export-options-grid">
                {/* PDF Export Options */}
                    {/* Page Size */}
                    <div className="export-option-group">
                      <label>📐 Page Size</label>
                      <select 
                        value={exportOptions.pageSize}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, pageSize: e.target.value }))}
                      >
                        <option value="a4">A4 (210 × 297 mm)</option>
                        <option value="a3">A3 (297 × 420 mm)</option>
                        <option value="letter">Letter (8.5 × 11 in)</option>
                      </select>
                    </div>

                    {/* Layout */}
                    <div className="export-option-group">
                      <label>📋 Cards Per Page</label>
                      <select 
                        value={exportOptions.layout}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, layout: e.target.value }))}
                      >
                        <option value="2x4">9 cards (3×3 layout)</option>
                        <option value="2x3">6 cards (2×3 layout)</option>
                        <option value="3x4">12 cards (4×3 layout) - A3 recommended</option>
                        <option value="1x1">1 card per page (Premium)</option>
                      </select>
                    </div>

                    {/* Quality */}
                    <div className="export-option-group">
                      <label>🎨 Print Quality</label>
                      <select 
                        value={exportOptions.quality}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, quality: e.target.value }))}
                      >
                        <option value="standard">Standard (~150 DPI) - Fast</option>
                        <option value="high">High (~200 DPI) - Balanced</option>
                        <option value="print">Print Ready (300+ DPI) - Best quality</option>
                      </select>
                    </div>

                    {/* Print Options */}
                    <div className="export-option-group">
                      <label>✂️ Print Shop Options</label>
                      <div className="checkbox-options">
                        <label className="checkbox-label">
                          <input 
                            type="checkbox"
                            checked={exportOptions.includeCropMarks}
                            onChange={(e) => setExportOptions(prev => ({ ...prev, includeCropMarks: e.target.checked }))}
                          />
                          <span>Include crop marks (cutting guides)</span>
                        </label>
                        <label className="checkbox-label">
                          <input 
                            type="checkbox"
                            checked={exportOptions.includeBleed}
                            onChange={(e) => setExportOptions(prev => ({ ...prev, includeBleed: e.target.checked }))}
                          />
                          <span>Add bleed area (3mm)</span>
                        </label>
                      </div>
                    </div>

                {/* Info box */}
                <div className="export-info-box">
                  <h4>💡 Tips for Best Results</h4>
                  <ul>
                    <li>Use <strong>Print Ready (300+ DPI)</strong> quality for professional printing</li>
                    <li>Enable <strong>crop marks</strong> if sending to a print shop</li>
                    <li>Portrait ID card size: <strong>54mm × 84mm</strong></li>
                    <li>8 cards per A4 page is optimal for cutting</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="edit-modal-footer">
              <button 
                className="cancel-edit-btn" 
                onClick={() => setExportModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="save-edit-btn export-confirm-btn" 
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? `⏳ Exporting ${exportProgress}%...` : '📥 Export Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IDCardViewer;
