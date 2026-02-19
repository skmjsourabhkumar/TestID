import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AdminLogin from './components/Admin/AdminLogin';
import FormBuilder from './components/Admin/FormBuilder';
import FormList from './components/Admin/FormList';
import SubmissionsViewer from './components/Admin/SubmissionsViewer';
import IDCardViewer from './components/Admin/IDCardViewer';
import IDCardSettings from './components/Admin/IDCardSettings';
import DynamicForm from './components/Public/DynamicForm';
import PublicFormsList from './components/Public/PublicFormsList';
import './App.css';

// Layout wrapper with navbar
function LayoutWithNavbar({ children, isAdminLoggedIn, adminUser, handleLogout }) {
  return (
    <>
      <nav className="navbar">
        <h1>CardCraft by Ratnesh</h1>
        <div className="nav-links">
          <Link to="/">Home</Link>
          {isAdminLoggedIn ? (
            <>
              <Link to="/admin">Admin Panel</Link>
              <Link to="/admin/id-card-settings">Background Image</Link>
              <Link to="/admin/id-cards">ID Cards</Link>
              <span className="user-info">Welcome, {adminUser?.email}</span>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <Link to="/admin">Admin Panel</Link>
          )}
        </div>
      </nav>
      {children}
    </>
  );
}

// Layout without navbar (for form filling)
function LayoutWithoutNavbar({ children }) {
  return children;
}

function App() {
  const [editingFormId, setEditingFormId] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    // Check if admin is already logged in
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');
    if (token && user) {
      setIsAdminLoggedIn(true);
      setAdminUser(JSON.parse(user));
    }
  }, []);

  const handleEdit = (formId) => {
    setEditingFormId(formId);
    setShowBuilder(true);
  };

  const handleSave = () => {
    setEditingFormId(null);
    setShowBuilder(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setIsAdminLoggedIn(false);
    setAdminUser(null);
  };

  const handleLoginSuccess = () => {
    const user = JSON.parse(localStorage.getItem('adminUser') || '{}');
    setAdminUser(user);
    setIsAdminLoggedIn(true);
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/form/:formId" element={
            <LayoutWithoutNavbar>
              <FormView />
            </LayoutWithoutNavbar>
          } />

          <Route path="/*" element={
            <LayoutWithNavbar 
              isAdminLoggedIn={isAdminLoggedIn} 
              adminUser={adminUser} 
              handleLogout={handleLogout}
            >
              <Routes>
                <Route path="/" element={
                  <PublicFormsList />
                } />

                <Route path="/admin" element={
                  isAdminLoggedIn ? (
                    <div className="admin-panel">
                      <div className="admin-header">
                        <h2>Admin Panel</h2>
                        <button onClick={() => {
                          setEditingFormId(null);
                          setShowBuilder(!showBuilder);
                        }}>
                          {showBuilder ? 'View All Forms' : 'Create New Form'}
                        </button>
                      </div>

                      {showBuilder ? (
                        <FormBuilder formId={editingFormId} onSave={handleSave} />
                      ) : (
                        <FormList onEdit={handleEdit} />
                      )}
                    </div>
                  ) : (
                    <AdminLogin onLoginSuccess={handleLoginSuccess} />
                  )
                } />

                <Route path="/admin/id-card-settings" element={
                  isAdminLoggedIn ? (
                    <IDCardSettings />
                  ) : (
                    <AdminLogin onLoginSuccess={handleLoginSuccess} />
                  )
                } />

                <Route path="/admin/id-cards" element={
                  isAdminLoggedIn ? (
                    <IDCardViewer />
                  ) : (
                    <AdminLogin onLoginSuccess={handleLoginSuccess} />
                  )
                } />
              </Routes>
            </LayoutWithNavbar>
          } />
        </Routes>
      </div>
    </Router>
  );
}

function FormView() {
  const { formId } = useParams();
  return <DynamicForm formId={formId} />;
}

export default App;
