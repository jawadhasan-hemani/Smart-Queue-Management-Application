import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './components/AppContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ComingSoon from './pages/ComingSoon';
import { StudentPortal } from './pages/student/StudentPortal';
import Admin from './pages/Admin';

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />

          {/* Placeholder routes for not-yet-built features */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/terms"
            element={
              <ComingSoon
                title="Terms of Service"
                description="Our Terms of Service are still being written. Check back soon!"
              />
            }
          />
          <Route
            path="/privacy"
            element={
              <ComingSoon
                title="Privacy Policy"
                description="Our Privacy Policy is still being written. Check back soon!"
              />
            }
          />

          {/* Student Portal Route */}
          <Route path="/dashboard/*" element={<StudentPortal />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;