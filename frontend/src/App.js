import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';

function App() {
  const [healthStatus, setHealthStatus] = useState('Checking...');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error('Not OK');
        return res.json();
      })
      .then((data) => {
        if (data.status === 'ok') {
          setHealthStatus('Online');
        } else {
          setHealthStatus('Unexpected response');
        }
      })
      .catch((err) => {
        setHealthStatus('Offline');
        console.error('Backend health check failed:', err);
      });
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
        {/* Header */}
        <header className="bg-white border-b border-slate-100 py-4 px-6 shadow-sm shadow-slate-100/50">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <Link to="/" className="text-xl font-bold text-indigo-600 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              QueueSmart
            </Link>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              API Status: 
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                healthStatus === 'Online' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : healthStatus === 'Offline'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  healthStatus === 'Online' 
                    ? 'bg-emerald-500' 
                    : healthStatus === 'Offline'
                    ? 'bg-rose-500'
                    : 'bg-amber-500 animate-pulse'
                }`}></span>
                {healthStatus}
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow flex items-center justify-center py-12">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-100 py-6 text-center text-sm text-slate-400">
          <p>© {new Date().getFullYear()} QueueSmart. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
