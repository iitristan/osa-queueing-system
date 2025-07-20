"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import loginbg from "../../_assets/loginbg.jpg";
import { motion } from "framer-motion";
import { FiCheckCircle, FiAlertCircle, FiArrowLeft } from "react-icons/fi";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simulate API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      if (!email.includes("@")) throw new Error("Invalid email format");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center items-center">
      <Image
        src={loginbg}
        alt="Background"
        layout="fill"
        objectFit="cover"
        quality={100}
        className="absolute inset-0 -z-10 filter brightness-75"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="h-2 bg-gradient-to-r from-[#FCBF15] to-[#FFD56A]" />

        <div className="p-8 space-y-6">
          <div className="flex justify-center">
            <Image
              src="/osa-header.png"
              alt="UST Logo"
              width={320}
              height={120}
              className="object-contain"
            />
          </div>

          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Forgot Password?
            </h1>
            <p className="text-gray-600">
              Enter your email to reset your password
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#FCBF15] focus:border-[#FCBF15] outline-none transition-all"
                placeholder="name@ust.edu.ph"
                disabled={loading || success}
              />
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition-all 
              transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : success ? (
                "Reset Email Sent!"
              ) : (
                "Reset Password"
              )}
            </button>
          </form>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center p-4 text-sm text-red-800 bg-red-50 rounded-lg"
            >
              <FiAlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center p-4 text-sm text-green-800 bg-green-50 rounded-lg"
            >
              <FiCheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              <span>Password reset email sent! Check your inbox.</span>
            </motion.div>
          )}

          <div className="text-center text-sm">
            <Link
              href="/login"
              className="text-gray-600 hover:text-gray-900 font-medium inline-flex items-center"
            >
              <FiArrowLeft className="w-4 h-4 mr-2" />
              Return to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
