import React, { useState } from "react";
import { FaGoogle, FaGithub, FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate, Link } from "react-router-dom";
import apiClient from "../lib/apiClient";
import { setSession } from "../lib/auth";
import { extractErrorMessage } from "../lib/api";
import { startOAuthLogin } from "../lib/oauth";
import useOAuthProviders from "../hooks/useOAuthProviders";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [redirectingTo, setRedirectingTo] = useState(null);
  const navigate = useNavigate();
  const oauthInfo = useOAuthProviders();

  // null info = still loading / API unreachable → leave the button clickable,
  // the server answers with a clear message if the provider really is missing.
  const isAvailable = (provider) => oauthInfo?.providers?.[provider] !== false;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiClient.post("/login", {
        email,
        password,
        rememberMe,
      });

      if (res.data.success && res.data.user) {
        // The JWT is set as an httpOnly cookie by the server; only the
        // non-sensitive user object is kept in the browser.
        setSession(res.data.user, { remember: rememberMe });
        navigate("/");
      } else {
        setError(res.data.message || "Login failed!");
      }
    } catch (err) {
      setError(await extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Full-page redirect to the API, which starts the OAuth round trip and sets
   * the httpOnly session cookie on the way back (see /auth/callback).
   */
  const handleSocialLogin = (provider) => {
    if (!isAvailable(provider) || redirectingTo) return;
    setError("");
    setRedirectingTo(provider);
    startOAuthLogin(provider);
  };

  const unconfigured = ["google", "github"].filter((provider) => !isAvailable(provider));

  return (
    <div className="min-h-screen flex items-center justify-center page-bg p-4">
      <div className="w-full max-w-md glass-card dark:bg-white/10 border border-white/20 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold gradient-title">Welcome Back</h1>
          <p className="text-sm text-white">Login to your AI Feature Kit account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <FaEnvelope className="text-gray-300" />
              </div>
              <input
                type="email"
                id="email"
                className="w-full p-3 pl-10 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <FaLock className="text-gray-300" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                className="w-full p-3 pl-10 pr-10 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <div
                className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-gray-300 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </div>
            </div>
            <div className="text-right mt-1">
              <Link to="/forgot-password" className="text-sm text-pink-300 hover:underline">
                <b>Forgot Password?</b>
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={() => setRememberMe(!rememberMe)}
              className="w-4 h-4 text-pink-500 rounded focus:ring-pink-500"
              disabled={loading}
            />
            <label className="text-white">Remember me</label>
          </div>

          {error && (
            <p className="text-red-400 text-center text-sm">{error}</p>
          )}

          <button
            type="submit"
            className="w-full btn-primary text-white font-bold py-3 rounded-lg transition-all"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="text-sm text-center text-white">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-pink-300 hover:underline">
            <b>Sign up</b>
          </Link>
        </p>

        <div className="flex flex-col gap-4 pt-4">
          <p className="text-xs uppercase tracking-wide text-gray-200 text-center">
            or continue with
          </p>

          <button
            type="button"
            onClick={() => handleSocialLogin("google")}
            disabled={!isAvailable("google") || Boolean(redirectingTo)}
            title={
              isAvailable("google")
                ? "Sign in with your Google account"
                : "Google OAuth credentials are not set on the server"
            }
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-red-200 via-pink-300 to-red-300 hover:opacity-90 text-gray-900 font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaGoogle /> {redirectingTo === "google" ? "Opening Google…" : "Login with Google"}
          </button>

          <button
            type="button"
            onClick={() => handleSocialLogin("github")}
            disabled={!isAvailable("github") || Boolean(redirectingTo)}
            title={
              isAvailable("github")
                ? "Sign in with your GitHub account"
                : "GitHub OAuth credentials are not set on the server"
            }
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-gray-200 to-gray-400 hover:opacity-90 text-gray-900 font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaGithub /> {redirectingTo === "github" ? "Opening GitHub…" : "Login with GitHub"}
          </button>

          {unconfigured.length > 0 && (
            <p className="text-xs text-gray-200 text-center">
              {unconfigured
                .map((id) => (id === "google" ? "Google" : "GitHub"))
                .join(" and ")}{" "}
              sign-in isn’t configured on the server yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
