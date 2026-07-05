import React from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="max-w-md w-full p-8 bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-100 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">
          User Dashboard
        </h2>
        <p className="text-slate-600 mb-8 leading-relaxed font-light">
          Queue status, services, and notifications will go here.
        </p>
        <button
          onClick={handleLogout}
          className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-3 rounded-xl transition duration-200"
        >
          Log out
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
