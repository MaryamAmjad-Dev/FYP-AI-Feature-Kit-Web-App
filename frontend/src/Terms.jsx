import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';

const Terms = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    // Force scroll to top on load and on every re-navigation
    window.scrollTo(0, 0);
  }, [pathname]);

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
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-8 bg-gradient-to-r from-fuchsia-400 to-rose-500 text-transparent bg-clip-text">
          Terms and Conditions
        </h1>

        <div className="space-y-6 text-sm md:text-base leading-relaxed">
          <p>
            Welcome to our AI Feature Kit platform. By accessing or using our services, you agree to be bound by the following terms and conditions:
          </p>

          <div>
            <h2 className="text-xl font-semibold text-white">1. Account Creation</h2>
            <ul className="list-disc list-inside">
              <li>All information provided during signup must be accurate.</li>
              <li>Accounts created with false information may be terminated.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">2. Data Usage</h2>
            <ul className="list-disc list-inside">
              <li>Your data is used only to improve the AI feature experience.</li>
              <li>We do not sell or share your personal data with third parties.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">3. User Responsibilities</h2>
            <ul className="list-disc list-inside">
              <li>You agree not to misuse or attempt to harm the platform.</li>
              <li>Users must not upload or share inappropriate or illegal content.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">4. Intellectual Property</h2>
            <p>All content, including UI, features, and code, is the property of the AI Feature Kit team. Unauthorized copying or use is prohibited.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">5. Termination</h2>
            <p>We reserve the right to suspend or terminate any user account found in violation of these terms without prior notice.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">6. Changes to Terms</h2>
            <p>These terms may be updated periodically. We encourage users to review this page regularly.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">7. Contact Us</h2>
            <p>If you have any questions or concerns about these Terms and Conditions, feel free to contact us through the form on our Contact page.</p>
          </div>

          <div className="text-center pt-6">
            <button
              onClick={() => navigate('/signup')}
              className="bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600 text-white font-semibold py-3 px-8 rounded-lg transition-all"
            >
              Back to Signup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
