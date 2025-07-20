"use client";

import { motion } from "framer-motion";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[#111111] flex items-center justify-center z-50">
      <div className="text-center space-y-6">
        <div className="relative">
          <motion.div
            className="w-16 h-16 border-4 border-[#FCBF15] rounded-full"
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{
              rotate: {
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
              },
              scale: {
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
          />
          <motion.div
            className="absolute inset-0 border-4 border-t-transparent border-[#FCBF15] rounded-full"
            animate={{
              rotate: -360,
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <motion.p
            className="text-[#FCBF15] text-xl font-semibold"
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            Loading
          </motion.p>
          <motion.div
            className="flex justify-center space-x-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 bg-[#FCBF15] rounded-full"
                animate={{
                  y: ["0%", "-50%", "0%"],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
} 