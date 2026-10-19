import React, { useState } from "react";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate, Link } from "react-router-dom";
import apiClient from "../lib/apiClient";
import { setSession } from "../lib/auth";
import { extractErrorMessage } from "../lib/api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendInfo, setResendInfo] = useState("");
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setResendInfo("");
    setShowResend(false);
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
      // 403 = password correct but the email is still unverified.
      if (err.response?.status === 403) setShowResend(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendInfo("");
    setResending(true);
    try {
      const res = await apiClient.post("/resend-verification", { email });
      setResendInfo(
        res.data.message ||
          "If that account exists and is not verified yet, a new verification email has been sent."
      );
      setShowResend(false);
    } catch (err) {
      setError(await extractErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

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
          {resendInfo && (
            <p className="text-green-300 text-center text-sm">{resendInfo}</p>
          )}

          {showResend && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full text-sm text-pink-300 hover:underline disabled:opacity-60"
            >
              {resending ? "Sending…" : "Resend verification email"}
            </button>
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
      </div>
    </div>
  );
};

export default Login;
