import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear user session (customize as needed)
    localStorage.clear();
    sessionStorage.clear();
    // Redirect to login after a short delay
    setTimeout(() => {
      navigate('/login');
    }, 1200);
  }, [navigate]);

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 text-white">
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Logging out...</h2>
        <p>You are being logged out and redirected to the login page.</p>
      </div>
    </section>
  );
}