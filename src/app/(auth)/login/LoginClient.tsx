"use client";

import React, { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import loginbg from "../../_assets/loginbg.jpg";
import { motion } from "framer-motion";
import { FiAlertCircle, FiLock, FiMail } from "react-icons/fi";
import ReCAPTCHA from "react-google-recaptcha";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  async function handleCaptchaSubmission(token: string | null) {
    try {
      if (token) {
        await fetch("/api", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });
        setIsVerified(true);
      }
    } catch (e) {
      setIsVerified(false);
    }
  }

  const handleChange = (token: string | null) => {
    handleCaptchaSubmission(token);
  };

  function handleExpired() {
    setIsVerified(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      if (result?.ok) {
        window.location.href = "/admin"; // Redirect on success
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
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
            <h1 className="text-3xl font-bold text-gray-900">OSAQA Login</h1>
            <p className="text-gray-600">
              Welcome back! Please sign in to continue
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
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#FCBF15] focus:border-[#FCBF15] outline-none transition-all"
                  placeholder="name@ust.edu.ph"
                  disabled={loading}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#FCBF15] focus:border-[#FCBF15] outline-none transition-all"
                  placeholder="Enter your password"
                  disabled={loading}
                />
              </div>
            </div>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center p-4 text-sm text-red-800 bg-red-50 rounded-lg"
              >
                <FiAlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                <span>
                  {error &&
                    (error.toLowerCase().includes("disabled") || error.toLowerCase().includes("request access")) ? (
                      "Your account is disabled. Please request access from the admin to use the system."
                    ) : (
                      error
                    )}
                </span>
              </motion.div>
            )}

            <div className="flex justify-center">
              <ReCAPTCHA
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
                ref={recaptchaRef}
                onChange={handleChange}
                onExpired={handleExpired}
                theme="light"
                size="normal"
                className="transform scale-90 -mx-4" // Adjust scale and margins
              />
            </div>
            <button
              type="submit"
              disabled={loading || !isVerified}
              className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition-all 
              transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Development Login Button */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-4 border border-yellow-500 rounded-lg bg-yellow-50">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">Development Access</h3>
              <button
                onClick={async () => {
                  try {
                    const result = await signIn("credentials", {
                      redirect: false,
                      email: "dev@ust.edu.ph",
                      password: "devpass123",
                    });

                    if (result?.error) {
                      throw new Error(result.error);
                    }

                    if (result?.ok) {
                      window.location.href = "/admin";
                    }
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Dev login failed");
                  }
                }}
                className="w-full py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-all 
                transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Quick Dev Login
              </button>
              <p className="mt-2 text-xs text-yellow-700">
                This button is only visible in development mode
              </p>
            </div>
          )}

          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-sm">
              or continue with
            </span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <button
            onClick={() => signIn("google", { callbackUrl: "/display" })}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg p-3 
            text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Image
              src="/google_logo.webp"
              alt="Google Logo"
              width={24}
              height={24}
              className="w-6 h-6"
            />
            <span className="text-sm font-medium">Sign in with Google</span>
          </button>

          <p className="text-center text-sm text-gray-600">
            Are you new?{" "}
            <Link
              href="/register"
              className="text-gray-900 hover:text-gray-700 font-medium underline transition-colors"
            >
              Register here
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
