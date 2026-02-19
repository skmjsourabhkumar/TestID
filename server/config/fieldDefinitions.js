const fieldDefinitions = {
  name: { label: 'Name', type: 'text', validation: 'string' },
  fatherName: { label: "Father's Name", type: 'text', validation: 'string' },
  motherName: { label: "Mother's Name", type: 'text', validation: 'string' },
  address: { label: 'Address', type: 'textarea', validation: 'string' },
  dateOfBirth: { label: 'Date of Birth', type: 'date', validation: 'date' },
  mobileNumber: { label: 'Mobile Number', type: 'tel', validation: 'phone' },
  aadhaarNumber: { label: 'Aadhaar Number', type: 'text', validation: 'aadhaar' },
  bloodGroup: { 
    label: 'Blood Group', 
    type: 'select', 
    options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    validation: 'select'
  },
  class: { label: 'Class', type: 'text', validation: 'string' },
  section: { label: 'Section', type: 'text', validation: 'string' },
  roleNumber: { label: 'Roll Number', type: 'text', validation: 'string' },
  admissionNumber: { label: 'Admission Number', type: 'text', validation: 'string' },
  stream: { 
    label: 'Stream', 
    type: 'select', 
    options: ['Arts', 'Science', 'Commerce'],
    validation: 'select'
  },
  session: { label: 'Session', type: 'text', validation: 'string', placeholder: 'e.g., 2025-27' },
  photo: {
    label: 'Photo',
    type: 'file',
    validation: 'image',
    accept: 'image/*',
    placeholder: 'Upload your photo (JPG, PNG)'
  },
  email:{
      label: 'Email',
      type: 'email',
      validation: 'email'
  }
};

module.exports = fieldDefinitions;
