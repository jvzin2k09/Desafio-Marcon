"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, ShieldCheck, Zap, KeyRound, X, CheckCircle2, AlertCircle, Headphones, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";

// ─── Malha de Triângulos Interativa (Canvas) ──────────────────────────────────
function TriangleMesh() {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: -1000, y: -1000 });
  const animFrameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    const onResize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", onResize);

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMouseLeave = () => {
      mouse.current = { x: -1000, y: -1000 };
    };
    
    // Ouve no parent para capturar mesmo sobre os inputs
    canvas.parentElement.addEventListener("mousemove", onMouseMove);
    canvas.parentElement.addEventListener("mouseleave", onMouseLeave);

    // Cria pontos
    const POINTS_COUNT = 90; // Densidade aumentada (dobro de triângulos)
    const points = [];
    for (let i = 0; i < POINTS_COUNT; i++) {
      points.push({
        x: Math.random() * width,
        y: Math.random() * height,
        originX: Math.random() * width,
        originY: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Atualiza posições
      for (let i = 0; i < points.length; i++) {
        let p = points[i];
        
        // Movimento natural
        p.originX += p.vx;
        p.originY += p.vy;
        
        // Rebate nas bordas
        if (p.originX < 0 || p.originX > width) p.vx *= -1;
        if (p.originY < 0 || p.originY > height) p.vy *= -1;

        // Atração magnética do mouse
        const dx = mouse.current.x - p.originX;
        const dy = mouse.current.y - p.originY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Se o mouse estiver perto, puxa o ponto em direção a ele
        if (dist < 180) {
          const force = (180 - dist) / 180;
          p.x = p.originX + (dx * force * 0.4);
          p.y = p.originY + (dy * force * 0.4);
        } else {
          // Retorna suavemente para a origem
          p.x += (p.originX - p.x) * 0.1;
          p.y += (p.originY - p.y) * 0.1;
        }
      }

      // Desenha triângulos e linhas
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            // Desenha linha
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.strokeStyle = `rgba(27, 58, 107, ${0.08 * (1 - dist/120)})`; // Azul marinho sutil
            ctx.lineWidth = 1;
            ctx.stroke();

            // Tenta formar um triângulo com um terceiro ponto
            for (let k = j + 1; k < points.length; k++) {
              const dx2 = points[j].x - points[k].x;
              const dy2 = points[j].y - points[k].y;
              const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
              
              const dx3 = points[k].x - points[i].x;
              const dy3 = points[k].y - points[i].y;
              const dist3 = Math.sqrt(dx3 * dx3 + dy3 * dy3);

              if (dist2 < 120 && dist3 < 120) {
                // Checa distância do triângulo ao mouse para iluminar
                const avgX = (points[i].x + points[j].x + points[k].x) / 3;
                const avgY = (points[i].y + points[j].y + points[k].y) / 3;
                const mDx = mouse.current.x - avgX;
                const mDy = mouse.current.y - avgY;
                const mDist = Math.sqrt(mDx * mDx + mDy * mDy);
                
                let opacity = 0.02; // Triângulo normal
                if (mDist < 150) {
                  opacity = 0.08 * (1 - mDist/150); // Acende ao passar o mouse
                }

                ctx.beginPath();
                ctx.moveTo(points[i].x, points[i].y);
                ctx.lineTo(points[j].x, points[j].y);
                ctx.lineTo(points[k].x, points[k].y);
                ctx.closePath();
                ctx.fillStyle = `rgba(27, 58, 107, ${opacity})`;
                ctx.fill();
              }
            }
          }
        }
        
        // Desenha o nó (ponto)
        ctx.beginPath();
        ctx.arc(points[i].x, points[i].y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(27, 58, 107, 0.2)";
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", onResize);
      if (canvasRef.current && canvasRef.current.parentElement) {
        canvasRef.current.parentElement.removeEventListener("mousemove", onMouseMove);
        canvasRef.current.parentElement.removeEventListener("mouseleave", onMouseLeave);
      }
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}
// ──────────────────────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const router = useRouter();

  // Estados para modal "Esqueceu a senha"
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotTab, setForgotTab] = useState("reset"); // "reset" | "help"
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPin, setForgotPin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (!forgotEmail) {
      setForgotError("Informe seu e-mail corporativo.");
      return;
    }
    if (!forgotPin || forgotPin.trim().length !== 4) {
      setForgotError("O PIN de segurança deve conter exatamente 4 dígitos.");
      return;
    }
    if (newPassword.length < 6) {
      setForgotError("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError("As senhas digitadas não conferem.");
      return;
    }

    setForgotLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail,
          pin: forgotPin,
          novaSenha: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setForgotError(data.error || "Não foi possível redefinir a senha.");
      } else {
        setForgotSuccess(data.message || "Senha alterada com sucesso!");
        setEmail(forgotEmail);
        setSenha(newPassword);
      }
    } catch {
      setForgotError("Erro de conexão com o servidor. Tente novamente.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    const res = await signIn("credentials", { email, senha, redirect: false });
    
    if (res?.error) {
      setError("Credenciais inválidas. Verifique e tente novamente.");
      setLoading(false);
    } else {
      // Buscar sessão para obter a role do usuário
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      const role = sessionData?.user?.role;

      // Animação de saída antes do redirect
      setIsExiting(true);
      setTimeout(() => {
        if (role === "ADMIN") {
          router.push("/admin");
        } else if (role === "ALMOXARIFE") {
          router.push("/almoxarifado");
        } else {
          router.push("/solicitante");
        }
      }, 600);
    }
  };

  return (
    <>
      <motion.div 
        key="auth-main-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen flex w-full bg-white font-sans relative overflow-hidden"
      >
        {/* Overlay de saída azul */}
        <AnimatePresence>
          {isExiting && (
            <motion.div
              initial={{ scaleX: 0, transformOrigin: "left" }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 z-[9999] bg-[#1B3A6B]"
            />
          )}
        </AnimatePresence>

          {/* ── Left: Formulário ───────────────────────────────────── */}
          <div className="w-full md:w-5/12 flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-white relative shadow-[4px_0_40px_rgba(27,58,107,0.12)] z-10">
            
            {/* Canvas Interativo em Background */}
            <TriangleMesh />
            
            {/* Topo */}
            <div className="flex justify-between items-center relative z-10">
              <div className="inline-flex items-center px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-primary" />
                Acesso Seguro
              </div>
              <span className="text-[10px] font-bold text-slate-300 tracking-widest">v2.1.0</span>
            </div>

            {/* Conteúdo central */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm mx-auto space-y-10"
            >
              {/* Logo */}
              <div className="flex justify-center md:justify-start">
                <Image
                  src="/Logo.png"
                  alt="Til Marcon Logo"
                  width={400} height={120}
                  className="object-contain h-20 sm:h-24 w-auto drop-shadow-sm"
                  priority
                />
              </div>

              {/* Headline */}
              <div>
                <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight">
                  Bem-vindo de volta
                </h1>
                <p className="text-slate-500 mt-1.5 text-sm font-medium">
                  Insira suas credenciais corporativas.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleAuth} className="space-y-6">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="text-red-500 text-sm font-bold text-center"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="space-y-4">
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input
                      type="email"
                      placeholder="E-mail corporativo"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-md py-3.5 pl-11 pr-4 font-medium text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition-all shadow-sm"
                    />
                  </div>

                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input
                      type="password"
                      placeholder="Senha"
                      required
                      value={senha}
                      onChange={e => setSenha(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-md py-3.5 pl-11 pr-4 font-medium text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotPin("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setForgotError("");
                      setForgotSuccess("");
                      setForgotTab("reset");
                      setShowForgotModal(true);
                    }}
                    className="text-sm font-bold text-slate-400 hover:text-primary transition-colors cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  className="relative w-full text-white font-black py-4 rounded-md flex items-center justify-center gap-2 text-sm tracking-widest uppercase overflow-hidden disabled:opacity-70 transition-shadow hover:shadow-[0_4px_20px_rgba(27,58,107,0.25)]"
                  style={{ background: "linear-gradient(135deg, #1B3A6B 0%, #1e5fa8 100%)" }}
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent hover:animate-[shimmer_1.5s_infinite]" />
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Acessar
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>

            {/* Footer */}
            <div className="flex justify-between items-center text-xs font-bold text-slate-400">
              <span>© {new Date().getFullYear()} Til Marcon</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Sistemas
              </span>
            </div>
          </div>

          {/* ── Right: Vídeo / Imagem de Fundo ─────────── */}
          <div className="hidden md:block w-7/12 relative overflow-hidden bg-slate-900">
            {/* Overlay com a cor da marca para manter a legibilidade e contraste */}
            <div className="absolute inset-0 bg-[#1B3A6B]/30 mix-blend-multiply z-10 pointer-events-none" />
            
            {/* --- Formas Geométricas Translúcidas (Glassmorphism) --- */}
            
            {/* Triângulo Base (Canto inferior direito) */}
            <div 
              className="absolute inset-0 z-20 pointer-events-none"
              style={{
                background: "rgba(27, 58, 107, 0.15)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                clipPath: "polygon(30% 100%, 100% 55%, 100% 100%)",
                borderTop: "1px solid rgba(255,255,255,0.05)"
              }}
            />

            {/* Raio / Faixa Diagonal (Canto superior esquerdo) */}
            <motion.div 
              animate={{ y: [0, -40, 0], x: [0, 20, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[-5%] left-[-10%] w-[50%] h-[30%] z-20 pointer-events-none"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(27,58,107,0.2) 100%)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                clipPath: "polygon(0 0, 100% 0, 80% 100%, 0 100%)",
                borderBottom: "1px solid rgba(255,255,255,0.15)",
                borderRight: "1px solid rgba(255,255,255,0.1)"
              }}
            />

            {/* Losango / Diamante (Flutuando no canto superior direito) */}
            <motion.div 
              animate={{ y: [0, 30, 0], rotate: [0, 90, 180, 270, 360] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="absolute top-[15%] right-[10%] w-32 h-32 z-20 pointer-events-none"
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                border: "2px solid rgba(255,255,255,0.2)"
              }}
            />

            {/* Triângulo Menor (Canto inferior esquerdo) */}
            <motion.div 
              animate={{ opacity: [0.2, 0.9, 0.2], scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-0 left-0 w-[20%] h-[20%] z-20 pointer-events-none"
              style={{
                background: "rgba(249, 115, 22, 0.15)", /* Laranja mais forte */
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                clipPath: "polygon(0 0, 0 100%, 100% 100%)",
                borderRight: "1px solid rgba(255,255,255,0.1)",
                borderTop: "1px solid rgba(255,255,255,0.1)"
              }}
            />
            {/* ----------------------------------------------------- */}

            <video 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover z-0"
            >
              <source src="/gif-marcon.mp4" type="video/mp4" />
            </video>

            {/* Elementos decorativos por cima do vídeo */}
            <div className="absolute inset-0 z-30 pointer-events-none p-12 flex flex-col justify-end text-white">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/10 backdrop-blur-md border border-white/20 mb-4">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-xs font-bold tracking-widest uppercase">Tecnologia Til Marcon</span>
                </div>
                <h2 className="text-4xl lg:text-5xl font-black font-display leading-tight mb-4 max-w-lg drop-shadow-lg uppercase tracking-tight">
                  SOMOS MOVIDOS PELA INOVAÇÃO
                </h2>
                <p className="text-white/80 text-lg font-medium max-w-md drop-shadow-md">
                  Organização inteligente para sua oficina.
                </p>
              </motion.div>
            </div>
          </div>
      </motion.div>

      {/* ── Modal: Recuperação de Senha ─────────────────────────── */}
      <AnimatePresence>
        {showForgotModal && (
          <motion.div
            key="forgot-password-modal-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          >
            {/* Backdrop com desfoque */}
            <div
              onClick={() => setShowForgotModal(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm cursor-pointer"
            />

            {/* Container Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-10 my-8"
            >
              {/* Topo com Identidade Til Marcon */}
              <div 
                className="p-6 text-white relative"
                style={{ background: "linear-gradient(135deg, #1B3A6B 0%, #1e5fa8 100%)" }}
              >
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="absolute right-4 top-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 text-xs font-bold uppercase tracking-wider mb-2">
                  <KeyRound className="w-3.5 h-3.5" />
                  Segurança Corporativa
                </div>
                <h3 className="text-xl font-display font-black tracking-tight">
                  Recuperação de Senha
                </h3>
                <p className="text-xs text-white/80 mt-1">
                  Redefina sua senha corporativa usando seu PIN ou consulte as opções de suporte.
                </p>

                {/* Abas */}
                <div className="flex gap-2 mt-4 pt-2 border-t border-white/15 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => { setForgotTab("reset"); setForgotError(""); }}
                    className={`px-3 py-1.5 rounded-md transition-all ${
                      forgotTab === "reset"
                        ? "bg-white text-[#1B3A6B] shadow-sm font-black"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    Redefinir com PIN
                  </button>
                  <button
                    type="button"
                    onClick={() => { setForgotTab("help"); setForgotError(""); }}
                    className={`px-3 py-1.5 rounded-md transition-all ${
                      forgotTab === "help"
                        ? "bg-white text-[#1B3A6B] shadow-sm font-black"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    Ajuda & Suporte TI
                  </button>
                </div>
              </div>

              {/* Corpo do Modal */}
              <div className="p-6">
                {forgotTab === "reset" ? (
                  forgotSuccess ? (
                    <div className="py-6 text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                        <CheckCircle2 className="w-9 h-9" />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-800">
                          Senha Atualizada!
                        </h4>
                        <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                          {forgotSuccess}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotModal(false);
                          setForgotSuccess("");
                        }}
                        className="w-full py-3.5 rounded-lg text-white font-black text-sm tracking-wider uppercase shadow-md transition-all hover:shadow-lg"
                        style={{ background: "linear-gradient(135deg, #1B3A6B 0%, #1e5fa8 100%)" }}
                      >
                        Entrar com Nova Senha
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      {forgotError && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-semibold flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{forgotError}</span>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                          E-mail Corporativo
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="email"
                            required
                            value={forgotEmail}
                            onChange={e => setForgotEmail(e.target.value)}
                            placeholder="seu.email@tilmarcon.com.br"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-9 pr-3 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1B3A6B] focus:bg-white transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                            PIN de Segurança (4 dígitos)
                          </label>
                          <span className="text-[11px] text-slate-400">Padrão: 0000 ou 1234</span>
                        </div>
                        <div className="relative">
                          <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            required
                            value={forgotPin}
                            onChange={e => setForgotPin(e.target.value.replace(/\D/g, ""))}
                            placeholder="••••"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-9 pr-3 text-sm font-mono tracking-widest text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1B3A6B] focus:bg-white transition-all"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          O mesmo PIN numérico utilizado para retirada de materiais no balcão.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Nova Senha
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type={showNewPassword ? "text" : "password"}
                              required
                              minLength={6}
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                              placeholder="Mínimo 6 caracteres"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-9 pr-9 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1B3A6B] focus:bg-white transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                            >
                              {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Confirmar Senha
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type={showNewPassword ? "text" : "password"}
                              required
                              minLength={6}
                              value={confirmPassword}
                              onChange={e => setConfirmPassword(e.target.value)}
                              placeholder="Repita a nova senha"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-9 pr-3 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1B3A6B] focus:bg-white transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setShowForgotModal(false)}
                          className="px-4 py-2.5 rounded-lg border border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          Cancelar
                        </button>

                        <button
                          type="submit"
                          disabled={forgotLoading}
                          className="flex-1 py-2.5 px-4 rounded-lg text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-60"
                          style={{ background: "linear-gradient(135deg, #1B3A6B 0%, #1e5fa8 100%)" }}
                        >
                          {forgotLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                          ) : (
                            <>
                              <KeyRound className="w-3.5 h-3.5" />
                              Atualizar Senha
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )
                ) : (
                  <div className="space-y-4 py-1 text-slate-700">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2 text-[#1B3A6B] font-bold text-sm">
                        <Headphones className="w-4 h-4" />
                        Central de TI e Almoxarifado Til Marcon
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Caso você não lembre do seu PIN corporativo ou necessite de desbloqueio, solicite o reset junto à equipe interna:
                      </p>
                      <div className="pt-2 text-xs space-y-1 font-medium text-slate-700">
                        <div>📞 <strong>Ramal Interno:</strong> 204 (Almoxarifado Central)</div>
                        <div>✉️ <strong>E-mail de Suporte:</strong> ti@tilmarcon.com.br</div>
                        <div>⏰ <strong>Horário de Atendimento:</strong> 07:00 às 17:00</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-xs space-y-1.5 text-slate-700">
                      <div className="font-bold text-[#1B3A6B]">
                        🔑 Contas de Demonstração / Testes Internos:
                      </div>
                      <div>
                        • <strong>Almoxarife:</strong> almoxarife@tilmarcon.com.br | Senha: <code className="bg-white px-1 py-0.5 rounded border border-blue-200 font-mono">123456</code> | PIN: <code className="bg-white px-1 py-0.5 rounded border border-blue-200 font-mono">0000</code>
                      </div>
                      <div>
                        • <strong>Operador:</strong> lucas@tilmarcon.com.br | Senha: <code className="bg-white px-1 py-0.5 rounded border border-blue-200 font-mono">123456</code> | PIN: <code className="bg-white px-1 py-0.5 rounded border border-blue-200 font-mono">1234</code>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setForgotTab("reset")}
                      className="w-full py-2.5 rounded-lg border border-[#1B3A6B] text-[#1B3A6B] font-bold text-xs uppercase tracking-wider hover:bg-blue-50/50 transition-colors"
                    >
                      Voltar para Redefinição com PIN
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
