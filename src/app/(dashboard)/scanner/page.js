"use client";
import { motion } from "framer-motion";

export default function ScannerPage() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[70vh]"
    >
      <div className="relative w-64 h-64 border-2 border-primary/30 rounded-xl flex items-center justify-center bg-primary/5 overflow-hidden shadow-inner">
        {/* Animated Laser Line */}
        <motion.div 
          animate={{ y: [-100, 100] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute w-full h-[2px] bg-primary shadow-[0_0_15px_#113B7A]"
        />
        <p className="text-primary/70 font-medium">Aguardando Câmera...</p>
      </div>
    </motion.div>
  );
}
