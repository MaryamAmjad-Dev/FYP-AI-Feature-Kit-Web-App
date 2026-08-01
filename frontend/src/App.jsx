import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import Navbar from './Navbar';
import Home from './Home';
import Features from './Features';
import TexttoImage from './TexttoImage';
import RemoveBg from './RemoveBg';
import VoiceChanger from './VoiceChanger';
import TexttoSpeech from './TexttoSpeech';
import Login from './Login';
import Signup from './Signup';
import Terms from './Terms';
import TermsOfService from './TermsOfService'; // ✅ NEW PAGE
import ForgotPassword from './ForgotPassword';
import Profile from './Profile';
import Footer from './Footer';
import PrivacyPolicy from './PrivacyPolicy';
import About from './About';
import Contact from './Contact';
import TextSummarizer from './TextSummarizer';
import History from './History';

const AppContent = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Navbar />
      <div className="pt-16">
        <Routes key={location.pathname} location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/home" element={<Home />} />
          <Route path="/text-to-image" element={<TexttoImage />} />
          <Route path="/background-removal" element={<RemoveBg />} />
          <Route path="/voice-changer" element={<VoiceChanger />} />
          <Route path="/text-to-speech" element={<TexttoSpeech />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/terms-of-service" element={<TermsOfService />} /> {/* ✅ NEW ROUTE */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/footer" element={<Footer />} />
          <Route path="/privacypolicy" element={<PrivacyPolicy />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/text-summarizer" element={<TextSummarizer />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
