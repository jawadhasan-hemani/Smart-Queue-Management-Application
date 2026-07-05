import React from 'react';
import { Link } from 'react-router-dom';

function Landing() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="max-w-md p-8 bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-100">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl mb-4">
          QueueSmart
        </h1>
        <p className="text-lg text-slate-600 mb-8 font-light">
          Skip the line, not your spot.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/login"
            className="w-full sm:w-32 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition duration-200 shadow-lg shadow-indigo-100"
          >
            Login
          </Link>
          <Link
            to="/admin"
            className="w-full sm:w-32 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-3 px-6 rounded-xl transition duration-200"
          >
            Admin
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Landing;
