import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './components/AppContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
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

          {/* Student Portal Route */}
          <Route path="/dashboard/*" element={<StudentPortal />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
