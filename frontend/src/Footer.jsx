import React from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaLinkedinIn, FaGithub } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-tr from-blue-950 to-gray-900 text-white py-10 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">

        {/* Branding */}
        <div>
          <h2 className="text-2xl font-bold text-pink-400">AI Feature Kit</h2>
          <p className="text-gray-300 mt-2">
            Empowering the world with intelligent solutions through advanced AI tools.
          </p>
        </div>

        {/* Navigation */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-pink-400">Explore</h3>
          <ul className="space-y-2 text-gray-300">
            <li><Link to="/" className="hover:text-white">Home</Link></li>
            <li><Link to="/features" className="hover:text-white">Features</Link></li>
            <li><Link to="/about" className="hover:text-white">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact Us</Link></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-pink-400">Legal</h3>
          <ul className="space-y-2 text-gray-300">
            <li><Link to="/privacypolicy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link to="/terms-of-service" className="hover:text-white">Terms of Service</Link></li>
            {/* Terms and Conditions link removed */}
          </ul>
        </div>

        {/* Social */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-pink-400">Follow Us</h3>
          <div className="flex space-x-4 text-gray-300">
            <a href="mailto:your-maryamamjad621@gmail.com" className="hover:text-white transition-all" aria-label="Email"><FaEnvelope /></a>
            <a href="https://www.linkedin.com/in/maryam-amjad-3a235a315/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-all" aria-label="LinkedIn"><FaLinkedinIn /></a>
            <a href="https://github.com/maryamaliali" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-all" aria-label="GitHub"><FaGithub /></a>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700 mt-10 pt-6 text-center text-gray-300 text-sm">
        &copy; {new Date().getFullYear()} AI Feature Kit. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
