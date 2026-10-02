"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function SplashScreen() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          exit={{ y: "-100%", borderBottomLeftRadius: "50%", borderBottomRightRadius: "50%" }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[100] bg-[#0c244c] flex flex-col items-center justify-center overflow-hidden"
        >
          
          {/* Fundo Fluido Animado (Ondas / Bolhas de Luz Flutuantes) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60">
            <motion.div 
              animate={{ 
                x: [0, 50, -50, 0], 
                y: [0, -50, 50, 0],
                scale: [1, 1.2, 0.9, 1]
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-[120vw] h-[120vw] md:w-[60vw] md:h-[60vw] rounded-full bg-[#1e488f] blur-[100px] mix-blend-screen"
            />
            <motion.div 
              animate={{ 
                x: [0, -60, 60, 0], 
                y: [0, 60, -60, 0],
                scale: [0.9, 1.3, 1, 0.9]
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute w-[100vw] h-[100vw] md:w-[50vw] md:h-[50vw] rounded-full bg-[#10a1dc] blur-[120px] mix-blend-screen opacity-50"
            />
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center">
            
            {/* Texto de Boas-vindas Gigante */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="mb-6 md:mb-8"
            >
              <h1 className="text-white/95 font-display font-black text-4xl md:text-6xl tracking-tight text-center drop-shadow-lg">
                Seja bem-vindo
              </h1>
            </motion.div>

            {/* Logo Moderna */}
            <motion.div
              initial={{ y: 30, scale: 0.85, opacity: 0, filter: "blur(15px)" }}
              animate={{ y: 0, scale: 1, opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <Image 
                src="/Logo.png" 
                alt="MARCON" 
                width={560} 
                height={210} 
                className="h-40 md:h-56 w-auto object-contain brightness-0 invert drop-shadow-2xl" 
                priority 
              />
            </motion.div>
            
            {/* Frase Complementar com Fonte Limpa */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="mt-8 flex flex-wrap justify-center overflow-hidden"
            >
              {`"Sempre a frente do seu tempo"`.split(" ").map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ y: 30, opacity: 0, filter: "blur(5px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  transition={{ 
                    duration: 0.8, 
                    delay: 0.7 + i * 0.12, 
                    ease: [0.16, 1, 0.3, 1] 
                  }}
                  className="text-white font-display font-medium text-xl md:text-3xl mr-1.5 md:mr-2.5 last:mr-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
                >
                  {word}
                </motion.span>
              ))}
            </motion.div>
          </div>
          
          {/* Linha Fina Brilhante Deslizando (Efeito Tech) */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 1.5, delay: 1, ease: "easeInOut" }}
            className="absolute bottom-24 w-64 md:w-96 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent"
          >
            <motion.div
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              className="w-1/4 h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
