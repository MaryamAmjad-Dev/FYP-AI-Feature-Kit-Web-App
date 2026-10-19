import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import PageFallback from './components/PageFallback';

// Route-level code splitting: only the landing page (plus the always-visible
// chrome) is needed up front; every other page is its own chunk.
const Home = lazy(() => import('./pages/Home'));
const Features = lazy(() => import('./pages/Features'));
const TexttoImage = lazy(() => import('./pages/TexttoImage'));
const RemoveBg = lazy(() => import('./pages/RemoveBg'));
const VoiceChanger = lazy(() => import('./pages/VoiceChanger'));
const TexttoSpeech = lazy(() => import('./pages/TexttoSpeech'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const Terms = lazy(() => import('./pages/Terms'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Profile = lazy(() => import('./pages/Profile'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const TextSummarizer = lazy(() => import('./pages/TextSummarizer'));
const History = lazy(() => import('./pages/History'));

const AppContent = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Navbar />
      <div className="pt-16">
        <Suspense fallback={<PageFallback />}>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            {/* Canonical home is "/"; keep the old link working. */}
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/features" element={<Features />} />
            <Route path="/text-to-image" element={<ProtectedRoute><TexttoImage /></ProtectedRoute>} />
            <Route path="/background-removal" element={<ProtectedRoute><RemoveBg /></ProtectedRoute>} />
            <Route path="/voice-changer" element={<ProtectedRoute><VoiceChanger /></ProtectedRoute>} />
            <Route path="/text-to-speech" element={<ProtectedRoute><TexttoSpeech /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            {/* Where Google/GitHub send the browser back after signing in. */}
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ForgotPassword />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route path="/privacypolicy" element={<PrivacyPolicy />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/text-summarizer" element={<ProtectedRoute><TextSummarizer /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
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
