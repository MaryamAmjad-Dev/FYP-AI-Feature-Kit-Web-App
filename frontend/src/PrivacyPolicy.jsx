import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';

const PrivacyPolicy = () => {
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

        <h1 className="text-4xl md:text-5xl font-bold text-center mb-8 bg-gradient-to-r from-fuchsia-400 to-rose-500 text-transparent bg-clip-text">
          Privacy Policy
        </h1>

        <div className="space-y-6 text-sm md:text-base leading-relaxed">
          <p>Your privacy is important to us. This Privacy Policy outlines how we collect, use, and protect your information when you use AI Feature Kit.</p>

          <div>
            <h2 className="text-xl font-semibold text-white">1. Information Collection</h2>
            <ul className="list-disc list-inside">
              <li>We collect basic user information such as email address during signup.</li>
              <li>Data collected may include usage analytics to improve our services.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">2. Data Usage</h2>
            <ul className="list-disc list-inside">
              <li>Your information is used to provide and enhance our services.</li>
              <li>We do not sell or share your data with third parties.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">3. Cookies</h2>
            <p>We may use cookies to personalize content and track website traffic. You can disable cookies through your browser settings.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">4. Data Security</h2>
            <p>We implement industry-standard security measures to protect your data from unauthorized access or disclosure.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">5. Third-Party Links</h2>
            <p>Our platform may contain links to external sites. We are not responsible for the privacy practices of these websites.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">6. Updates to Policy</h2>
            <p>This Privacy Policy may be updated from time to time. Please review this page regularly for any changes.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">7. Contact Us</h2>
            <p>If you have any questions regarding this policy, please contact us via the form on our Contact page.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
