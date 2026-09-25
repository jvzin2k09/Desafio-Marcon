"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Lock, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PinSetupModal() {
  const { data: session, update } = useSession();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const isOperador = session?.user?.role === "OPERADOR";
  const hasPin = session?.user?.hasPin;
  const showModal = isOperador && hasPin === false;

  useEffect(() => {
    if (showModal && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showModal, step]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (step === 1) {
      if (pin.length !== 4) { setError("O PIN deve ter exatamente 4 dígitos."); return; }
      setStep(2);
      return;
    }

    if (pin !== confirmPin) {
      setError("Os PINs não coincidem. Tente novamente.");
      setPin(""); setConfirmPin(""); setStep(1);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (res.ok) {
        await update({ hasPin: true });
      } else {
        setError(data.error || "Erro ao salvar PIN.");
      }
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e, setter) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
    setter(val);
  };

  if (!showModal) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.94, y: 16 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="site-card w-full max-w-md p-8 relative overflow-hidden"
        >
          {/* Decorative blobs using project palette */}
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full mix-blend-multiply filter blur-3xl opacity-20" style={{ background: "var(--primary)" }} />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full mix-blend-multiply filter blur-3xl opacity-20" style={{ background: "var(--accent)" }} />

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ background: "var(--surface-2)" }}>
              <Lock className="w-8 h-8" style={{ color: "var(--primary)" }} />
            </div>
            
            <h2 className="text-2xl font-display font-black text-slate-900 mb-2">Cadastre seu PIN</h2>
            <p className="text-sm text-slate-500 text-center mb-8">
              {step === 1
                ? "Este código de 4 dígitos será sua assinatura digital para retirar materiais no balcão."
                : "Confirme o código digitado para garantir a segurança."}
            </p>

            <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
              <div className="w-full relative max-w-xs mx-auto">
                <input
                  ref={inputRef}
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  className="site-input w-full text-center text-4xl tracking-[1em] font-mono py-4 rounded-xl"
                  placeholder="****"
                  value={step === 1 ? pin : confirmPin}
                  onChange={(e) => handleInput(e, step === 1 ? setPin : setConfirmPin)}
                  maxLength={4}
                  disabled={loading}
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mt-4 text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg"
                >
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </motion.div>
              )}

              <motion.button
                type="submit"
                disabled={loading || (step === 1 ? pin.length !== 4 : confirmPin.length !== 4)}
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.99 }}
                className="w-full mt-8 text-white font-black py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm tracking-widest uppercase hover:shadow-primary-glow"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                ) : (
                  step === 1 ? "Continuar" : "Salvar PIN"
                )}
              </motion.button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
