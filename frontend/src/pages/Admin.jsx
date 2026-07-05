import React from 'react';
import { useNavigate } from 'react-router-dom';

function Admin() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="max-w-md w-full p-8 bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-100 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">
          Admin Page
        </h2>
        <p className="text-slate-600 mb-8 leading-relaxed font-light">
          Service and queue management will go here.
        </p>
        <button
          onClick={handleBack}
          className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl transition duration-200"
        >
          Back
        </button>
      </div>
    </div>
  );
}

export default Admin;
