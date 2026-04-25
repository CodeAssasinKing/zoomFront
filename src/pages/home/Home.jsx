import React from "react";
import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="inline-block p-3 rounded-2xl bg-blue-600 text-white mb-6 shadow-lg shadow-blue-200">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Next-Gen <span className="text-blue-600">Virtual Learning</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-lg mx-auto">
            Connect with teachers and students around the world in real-time
            with high-quality video and chat.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          {/* Login Card */}
          <Link
            to="/login"
            className="group p-8 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 text-left"
          >
            <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
              Welcome Back
            </h3>
            <p className="text-slate-500 mt-2 mb-4">
              Already have an account? Sign in to access your classes.
            </p>
            <span className="inline-flex items-center text-blue-600 font-semibold">
              Login to Account
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </span>
          </Link>

          {/* Signup Card */}
          <Link
            to="/signup"
            className="group p-8 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 text-left"
          >
            <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
              Join Us
            </h3>
            <p className="text-slate-500 mt-2 mb-4">
              New here? Create a free account to start learning or teaching.
            </p>
            <span className="inline-flex items-center text-indigo-600 font-semibold">
              Create Account
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </span>
          </Link>
        </div>

        {/* Footer info */}
        <p className="mt-12 text-slate-400 text-sm">
          Secure. Fast. Real-time. Powered by WebRTC.
        </p>
      </div>
    </div>
  );
}

export default Home;
