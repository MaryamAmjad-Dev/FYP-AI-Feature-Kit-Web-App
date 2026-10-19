import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaGoogle, FaGithub } from "react-icons/fa";
import apiClient from "../lib/apiClient";
import { extractErrorMessage } from "../lib/api";
import { startOAuthLogin } from "../lib/oauth";
import useOAuthProviders from "../hooks/useOAuthProviders";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [redirectingTo, setRedirectingTo] = useState(null);
  const navigate = useNavigate();
  const oauthInfo = useOAuthProviders();

  const isAvailable = (provider) => oauthInfo?.providers?.[provider] !== false;

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username || !email || !password || !confirmPassword || !accepted) {
      setError("Please fill all fields and accept terms!");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must be at least 8 characters and contain a letter and a number.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post("/signup", {
        name: username,
        email,
        password,
      });

      if (res.data.success) {
        setSuccess("Account created successfully!");
        setUsername("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setAccepted(false);
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setError(res.data.message || "Registration failed");
      }
    } catch (err) {
      setError(await extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Social sign-up uses the very same round trip as social login: the API
   * creates the account on the first visit and sets the session cookie on the
   * way back, so the person lands already signed in.
   */
  const handleSocialSignup = (provider) => {
    if (!isAvailable(provider) || redirectingTo) return;
    setError("");
    setSuccess("");
    setRedirectingTo(provider);
    startOAuthLogin(provider);
  };

  const unconfigured = ["google", "github"].filter((provider) => !isAvailable(provider));

  return (
    <div className="min-h-screen flex items-center justify-center page-bg p-4">
      <div className="w-full max-w-md glass-card border border-white/20 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold gradient-title">
            Create Your Account
          </h1>
          <p className="text-sm text-white">
            Sign up to get started with AI Feature Kit
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-white">
              Username
            </label>
            <input
              type="text"
              id="username"
              className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white">
              Email
            </label>
            <input
              type="email"
              id="email"
              className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                className="w-full p-3 pr-10 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div
                className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-gray-300 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-white">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                className="w-full p-3 pr-10 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="Enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <div
                className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-gray-300 hover:text-white"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="terms"
              type="checkbox"
              checked={accepted}
              onChange={() => setAccepted(!accepted)}
              className="w-4 h-4 text-pink-500 rounded focus:ring-pink-500"
              required
            />
            <label htmlFor="terms" className="text-sm text-white">
              I accept the{" "}
              <Link to="/terms" className="text-pink-300 hover:underline">
                <b>Terms and Conditions</b>
              </Link>
            </label>
          </div>

          {error && <p className="text-red-400 text-center">{error}</p>}
          {success && <p className="text-green-400 text-center">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary text-white font-bold py-3 rounded-lg transition-all"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-sm text-center text-white">
          Already have an account?{" "}
          <Link to="/login" className="text-pink-300 hover:underline">
            <b>Login here</b>
          </Link>
        </p>

        <div className="flex flex-col gap-4 pt-4">
          <p className="text-xs uppercase tracking-wide text-gray-200 text-center">
            or sign up with
          </p>

          <button
            type="button"
            onClick={() => handleSocialSignup("google")}
            disabled={!isAvailable("google") || Boolean(redirectingTo)}
            title={
              isAvailable("google")
                ? "Continue with your Google account"
                : "Google OAuth credentials are not set on the server"
            }
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-red-200 via-pink-300 to-red-300 hover:opacity-90 text-gray-900 font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaGoogle /> {redirectingTo === "google" ? "Opening Google…" : "Sign up with Google"}
          </button>

          <button
            type="button"
            onClick={() => handleSocialSignup("github")}
            disabled={!isAvailable("github") || Boolean(redirectingTo)}
            title={
              isAvailable("github")
                ? "Continue with your GitHub account"
                : "GitHub OAuth credentials are not set on the server"
            }
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-gray-200 to-gray-400 hover:opacity-90 text-gray-900 font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaGithub /> {redirectingTo === "github" ? "Opening GitHub…" : "Sign up with GitHub"}
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

export default Signup;
