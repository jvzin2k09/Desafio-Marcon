"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function SplashScreen() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] bg-[#1B3A6B] flex flex-col items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center justify-center drop-shadow-[0_0_35px_rgba(37,99,235,0.6)]"
          >
            <Image 
              src="/Logo.png" 
              alt="MARCON" 
              width={300} 
              height={100} 
              className="h-24 md:h-32 w-auto object-contain brightness-0 invert" 
              priority 
            />
          </motion.div>

          <div className="absolute bottom-16 w-48 md:w-64 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.8, ease: "linear" }}
              className="h-full bg-blue-600 rounded-full"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
