/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUser, FaSignOutAlt, FaCog, FaBars, FaTimes } from 'react-icons/fa';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem('loggedIn') === 'true');
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('userData');
    localStorage.removeItem('rememberMe');
    setIsLoggedIn(false);
    setIsDropdownOpen(false);
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-blue-900/50 backdrop-blur-sm fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
            AI Feature Kit
          </Link>

          {/* Center Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {['/home', '/features', '/about', '/contact'].map((path, idx) => (
              <Link
                key={idx}
                to={path}
                className={`text-lg font-medium ${
                  isActive(path)
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-white hover:text-purple-300 hover:border-b-2 hover:border-purple-300'
                } transition duration-300`}
              >
                {path === '/home'
                  ? 'Home'
                  : path === '/features'
                  ? 'Features'
                  : path === '/about'
                  ? 'About Us'
                  : 'Contact Us'}
              </Link>
            ))}
          </div>

          {/* Right Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {!isLoggedIn ? (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg text-white hover:bg-purple-600/50 transition"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105 transition"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 text-white hover:scale-105 transition-transform"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 flex items-center justify-center shadow-md">
                    <FaUser className="w-5 h-5 text-white" />
                  </div>
                </button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-52 rounded-xl bg-white/30 backdrop-blur-lg border border-white/30 shadow-2xl py-2 z-50"
                    >
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2 text-white hover:bg-pink-600/40 transition rounded-lg"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <FaUser className="w-4 h-4 mr-2" />
                        Profile
                      </Link>
                     
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-white hover:bg-rose-500/40 transition rounded-lg"
                      >
                        <FaSignOutAlt className="w-4 h-4 mr-2" />
                        Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white hover:text-purple-300 transition"
            >
              {isMobileMenuOpen ? <FaTimes className="w-6 h-6" /> : <FaBars className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white/10 backdrop-blur-xl border-t border-white/20"
          >
            <div className="px-4 pt-4 pb-6 space-y-2">
              {['/home', '/features', '/about', '/contact'].map((path, idx) => (
                <Link
                  key={idx}
                  to={path}
                  className={`block px-4 py-2 rounded-lg text-white hover:bg-pink-500/30 transition ${
                    isActive(path) ? 'bg-pink-500/20' : ''
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {path === '/home'
                    ? 'Home'
                    : path === '/features'
                    ? 'Features'
                    : path === '/about'
                    ? 'About Us'
                    : 'Contact Us'}
                </Link>
              ))}

              {!isLoggedIn ? (
                <>
                  <Link
                    to="/login"
                    className="block px-4 py-2 rounded-lg text-white hover:bg-purple-600/50 transition"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="block px-4 py-2 rounded-lg text-white hover:bg-purple-600/50 transition"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/profile"
                    className="flex items-center px-4 py-2 rounded-lg text-white hover:bg-pink-500/30 transition"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <FaUser className="w-4 h-4 mr-2" />
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center px-4 py-2 rounded-lg text-white hover:bg-pink-500/30 transition"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <FaCog className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-2 rounded-lg text-white hover:bg-rose-500/30 transition"
                  >
                    <FaSignOutAlt className="w-4 h-4 mr-2" />
                    Logout
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;