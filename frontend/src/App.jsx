import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Navbar from './Navbar';
import Footer from './Footer';
import { isLoggedIn } from './auth';

// Route-level code splitting: only the landing page (plus the always-visible
// chrome) is needed up front; every other page is its own chunk.
const Home = lazy(() => import('./Home'));
const Features = lazy(() => import('./Features'));
const TexttoImage = lazy(() => import('./TexttoImage'));
const RemoveBg = lazy(() => import('./RemoveBg'));
const VoiceChanger = lazy(() => import('./VoiceChanger'));
const TexttoSpeech = lazy(() => import('./TexttoSpeech'));
const Login = lazy(() => import('./Login'));
const Signup = lazy(() => import('./Signup'));
const Terms = lazy(() => import('./Terms'));
const TermsOfService = lazy(() => import('./TermsOfService'));
const ForgotPassword = lazy(() => import('./ForgotPassword'));
const Profile = lazy(() => import('./Profile'));
const PrivacyPolicy = lazy(() => import('./PrivacyPolicy'));
const About = lazy(() => import('./About'));
const Contact = lazy(() => import('./Contact'));
const TextSummarizer = lazy(() => import('./TextSummarizer'));
const History = lazy(() => import('./History'));

/** Renders `children` only while a session exists; otherwise → /login. */
function ProtectedRoute({ children }) {
  const location = useLocation();
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}

function PageFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-white/80" role="status">
      Loading…
    </div>
  );
}

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
            <Route path="/text-to-image" element={<TexttoImage />} />
            <Route path="/background-removal" element={<RemoveBg />} />
            <Route path="/voice-changer" element={<VoiceChanger />} />
            <Route path="/text-to-speech" element={<TexttoSpeech />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
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
            <Route path="/text-summarizer" element={<TextSummarizer />} />
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
