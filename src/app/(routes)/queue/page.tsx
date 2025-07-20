"use client";

import { useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { FiAlertCircle } from "react-icons/fi";
import loginbg from "../../_assets/loginbg.jpg";
import LoadingScreen from "@/app/_components/LoadingScreen";

const COUNTER_TYPES = [
  "General Inquiries",
  "Document Processing",
  "Student Organizations",
  "ID/Form Requests",
  "Scholarships",
  "Student Services",
  "Complaints/Concerns",
];

const COLLEGES = [
  "Faculty of Arts and Letters",
  "Faculty of Civil Law",
  "Faculty of Medicine and Surgery",
  "Faculty of Pharmacy",
  "College of Architecture",
  "College of Commerce and Business Administration",
  "College of Education",
  "College of Fine Arts and Design",
  "College of Nursing",
  "College of Rehabilitation Sciences",
  "College of Science",
  "Conservatory of Music",
  "Graduate School",
  "Institute of Information and Computing Sciences",
  "Institute of Physical Education and Athletics",
  "UST Junior High School",
  "UST Senior High School",
];

export default function QueuePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState("");
  const [queueNumber, setQueueNumber] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    organization: "",
    college: "",
    email: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateEmail = (email: string) => {
    return email.endsWith("@ust.edu.ph");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate UST email
    if (!validateEmail(formData.email)) {
      setError("Please use a valid UST email address (@ust.edu.ph)");
      setLoading(false);
      return;
    }

    try {
      // Get available officers for the selected counter type
      const { data: officers, error: officerError } = await supabase
        .from("officers")
        .select("*")
        .eq("counter_type", selectedType)
        .eq("online", true)
        .order("prefix");

      if (officerError) throw officerError;

      if (!officers || officers.length === 0) {
        throw new Error("No available officers for this service");
      }

      // Get the first available officer
      const officer = officers[0];

      // Get the current counter value
      const { data: counterData, error: counterError } = await supabase
        .from("queue_counters")
        .select("counter")
        .eq("officer_id", officer.id)
        .single();

      if (counterError) throw counterError;

      const counter = counterData?.counter || 1;

      // Create new queue item with additional information
      const { error: queueError } = await supabase.from("queue").insert({
        officer_id: officer.id,
        number: counter,
        status: "waiting",
        is_prioritized: false,
        organization: formData.organization,
        college: formData.college,
        email: formData.email,
      });

      if (queueError) throw queueError;

      // Update counter
      const { error: updateError } = await supabase
        .from("queue_counters")
        .upsert({
          officer_id: officer.id,
          counter: counter + 1,
        });

      if (updateError) throw updateError;

      // Set the queue number for display
      setQueueNumber(`${officer.prefix}${counter}`);
    } catch (err) {
      console.error("Error getting queue number:", err);
      setError(
        err instanceof Error ? err.message : "Failed to get queue number"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

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
              Get Queue Number
            </h1>
            <p className="text-gray-600">
              Fill in your details to get a queue number
            </p>
          </div>

          {queueNumber ? (
            <div className="text-center space-y-4">
              <div className="text-6xl font-bold text-[#FCBF15] mb-4">
                {queueNumber}
              </div>
              <p className="text-gray-600">
                Please wait for your number to be called
              </p>
              <button
                onClick={() => {
                  setQueueNumber(null);
                  setSelectedType("");
                  setFormData({
                    organization: "",
                    college: "",
                    email: "",
                  });
                }}
                className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition-all"
              >
                Get Another Number
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
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

              <div>
                <label
                  htmlFor="organization"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Organization Name
                </label>
                <input
                  type="text"
                  id="organization"
                  name="organization"
                  value={formData.organization}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#FCBF15] focus:border-[#FCBF15] outline-none transition-all"
                  required
                  placeholder="Enter your organization name"
                />
              </div>

              <div>
                <label
                  htmlFor="college"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  College/Faculty
                </label>
                <select
                  id="college"
                  name="college"
                  value={formData.college}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#FCBF15] focus:border-[#FCBF15] outline-none transition-all"
                  required
                >
                  <option value="">Select your college/faculty</option>
                  {COLLEGES.map((college) => (
                    <option key={college} value={college}>
                      {college}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  UST Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#FCBF15] focus:border-[#FCBF15] outline-none transition-all"
                  required
                  placeholder="Enter your UST email (@ust.edu.ph)"
                />
              </div>

              <div>
                <label
                  htmlFor="type"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Select Your Concern
                </label>
                <select
                  id="type"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#FCBF15] focus:border-[#FCBF15] outline-none transition-all"
                  required
                >
                  <option value="">Select a concern</option>
                  {COUNTER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  !selectedType ||
                  !formData.organization ||
                  !formData.college ||
                  !formData.email
                }
                className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition-all 
                transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Getting Number...</span>
                  </div>
                ) : (
                  "Get Queue Number"
                )}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
