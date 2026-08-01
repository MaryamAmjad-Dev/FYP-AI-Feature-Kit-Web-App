import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';

const TermsOfService = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 bg-[length:200%_200%] animate-gradient-x text-white overflow-y-auto px-6 py-10">
      <div className="max-w-4xl mx-auto relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl text-gray-200">
        {/* Close button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 right-4 text-white text-xl hover:text-pink-400"
          title="Close"
        >
          <FaTimes />
        </button>

        <h1 className="text-4xl md:text-5xl font-bold text-center mb-8 bg-gradient-to-r from-rose-400 to-pink-500 text-transparent bg-clip-text">
          Terms of Service
        </h1>

        <div className="space-y-6 text-sm md:text-base leading-relaxed">
          <p>Welcome to AI Feature Kit! By using our services, you agree to the following terms and conditions. Please read them carefully.</p>

          <div>
            <h2 className="text-xl font-semibold text-white">1. Acceptance of Terms</h2>
            <p>By accessing or using our platform, you accept and agree to be bound by these Terms of Service.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">2. Use of Service</h2>
            <p>You may not use the service for any illegal or unauthorized purpose. You agree to comply with all laws and regulations.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">3. Account Responsibilities</h2>
            <p>You are responsible for safeguarding your login credentials and for any activity on your account.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">4. Intellectual Property</h2>
            <p>All content and code on the site is the property of AI Feature Kit. You may not reproduce, duplicate, or exploit any part without permission.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">5. Service Modifications</h2>
            <p>We reserve the right to modify or discontinue the service at any time without notice.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">6. Termination</h2>
            <p>We may suspend or terminate your access to the service if you violate these terms.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">7. Contact Us</h2>
            <p>If you have any questions about these Terms of Service, please contact us via the Contact page.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
