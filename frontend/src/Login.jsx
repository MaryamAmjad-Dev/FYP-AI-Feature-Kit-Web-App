import React, { useState } from "react";
import { FaGoogle, FaGithub, FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:5000/api/login", {
        email,
        password,
      });

      if (res.data.success) {
        localStorage.setItem("userData", JSON.stringify(res.data.user));
        localStorage.setItem("loggedIn", "true");
        if (rememberMe) {
          localStorage.setItem("rememberMe", "true");
        }
        navigate("/home");
      } else {
        setError(res.data.message || "Login failed!");
      }
    } catch (err) {
      if (err.code === "ERR_NETWORK") {
        setError("Cannot connect to server. Please try again later.");
      } else {
        setError(err.response?.data?.message || "Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    alert(`Social login with ${provider} not implemented`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 bg-[length:200%_200%] animate-gradient-x p-4">
      <div className="w-full max-w-md backdrop-blur-xl bg-white/10 dark:bg-white/10 border border-white/20 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-fuchsia-400 to-rose-500 text-transparent bg-clip-text">Welcome Back</h1>
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
            className="w-full bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600 text-white font-bold py-3 rounded-lg transition-all"
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
          <button
            onClick={() => handleSocialLogin("Google")}
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-red-200 via-pink-300 to-red-300 hover:opacity-90 text-gray-900 font-semibold py-2.5 rounded-lg transition-all"
          >
            <FaGoogle /> Login with Google
          </button>

          <button
            onClick={() => handleSocialLogin("GitHub")}
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-gray-200 to-gray-400 hover:opacity-90 text-gray-900 font-semibold py-2.5 rounded-lg transition-all"
          >
            <FaGithub /> Login with GitHub
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
